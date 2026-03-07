// src/modules/deals/deals.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RbacService, RbacContext } from '@/common/services/rbac.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { CloseDealDto } from './dto/close-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateDealDto) {
    // Verify pipeline exists and belongs to tenant
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: dto.pipelineId, tenantId },
    });

    if (!pipeline) {
      throw new NotFoundException('خط المبيعات غير موجود');
    }

    // Verify stage exists and belongs to pipeline
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipelineId: dto.pipelineId },
    });

    if (!stage) {
      throw new NotFoundException('المرحلة غير موجودة');
    }

    return this.prisma.deal.create({
      data: {
        tenantId,
        ownerId: dto.ownerId || userId,
        pipelineId: dto.pipelineId,
        stageId: dto.stageId,
        contactId: dto.contactId,
        companyId: dto.companyId,
        title: dto.title,
        value: dto.value,
        currency: dto.currency || 'SAR',
        probability: dto.probability ?? stage.probability,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : null,
        tags: dto.tags || [],
        customFields: dto.customFields || {},
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: true,
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, userId: string, userRole: string, query: QueryDealsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      ownerId,
      pipelineId,
      stageId,
      contactId,
      companyId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Get RBAC ownership filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const ownershipFilter = await this.rbac.getOwnershipFilter(rbacContext);

    // Admin can filter by any ownerId, others are restricted
    const effectiveOwnerFilter = this.rbac.isAdmin(userRole) && ownerId
      ? { ownerId }
      : ownershipFilter;

    const where: Prisma.DealWhereInput = {
      tenantId,
      ...effectiveOwnerFilter,
      ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
      ...(pipelineId && { pipelineId }),
      ...(stageId && { stageId }),
      ...(contactId && { contactId }),
      ...(companyId && { companyId }),
      ...(status && { status }),
    };

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          stage: true,
          pipeline: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data: deals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string, userId?: string, userRole?: string) {
    const deal = await this.prisma.deal.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contact: true,
        company: true,
        stage: true,
        pipeline: {
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('الصفقة غير موجودة');
    }

    // Check access permissions
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      const canAccess = await this.rbac.canAccessResource(deal, rbacContext);
      if (!canAccess) {
        throw new ForbiddenException('لا يمكنك الوصول إلى هذه الصفقة');
      }
    }

    return deal;
  }

  async update(tenantId: string, id: string, dto: UpdateDealDto, userId?: string, userRole?: string) {
    const deal = await this.findOne(tenantId, id, userId, userRole);

    // Check edit permission
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      const canEdit = await this.rbac.canEditResource(deal, rbacContext);
      if (!canEdit) {
        throw new ForbiddenException('لا يمكنك تعديل هذه الصفقة');
      }
    }

    // If updating stage, verify it belongs to same pipeline
    if (dto.stageId && dto.stageId !== deal.stageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id: dto.stageId, pipelineId: deal.pipelineId },
      });

      if (!stage) {
        throw new BadRequestException('المرحلة غير موجودة في خط المبيعات');
      }
    }

    return this.prisma.deal.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.stageId && { stageId: dto.stageId }),
        ...(dto.contactId !== undefined && { contactId: dto.contactId }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.ownerId && { ownerId: dto.ownerId }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.expectedCloseDate !== undefined && {
          expectedCloseDate: dto.expectedCloseDate
            ? new Date(dto.expectedCloseDate)
            : null,
        }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.customFields && { customFields: dto.customFields }),
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: true,
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async moveStage(tenantId: string, id: string, dto: MoveDealDto, userId?: string, userRole?: string) {
    const deal = await this.findOne(tenantId, id, userId, userRole);

    // Verify stage exists and belongs to same pipeline
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipelineId: deal.pipelineId },
    });

    if (!stage) {
      throw new BadRequestException('المرحلة غير موجودة في خط المبيعات');
    }

    return this.prisma.deal.update({
      where: { id },
      data: {
        stageId: dto.stageId,
        probability: stage.probability,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: true,
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async closeDeal(tenantId: string, id: string, dto: CloseDealDto, userId?: string, userRole?: string) {
    await this.findOne(tenantId, id, userId, userRole);

    if (dto.status === 'lost' && !dto.lostReason) {
      throw new BadRequestException('يجب تحديد سبب الخسارة');
    }

    return this.prisma.deal.update({
      where: { id },
      data: {
        status: dto.status,
        closedAt: new Date(),
        probability: dto.status === 'won' ? 100 : 0,
        lostReason: dto.status === 'lost' ? dto.lostReason : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: true,
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async reopenDeal(tenantId: string, id: string, userId?: string, userRole?: string) {
    const deal = await this.findOne(tenantId, id, userId, userRole);

    if (deal.status === 'open') {
      throw new BadRequestException('الصفقة مفتوحة بالفعل');
    }

    return this.prisma.deal.update({
      where: { id },
      data: {
        status: 'open',
        closedAt: null,
        lostReason: null,
        probability: deal.stage.probability,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: true,
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string, userId?: string, userRole?: string) {
    const deal = await this.findOne(tenantId, id, userId, userRole);

    // Check delete permission - sales reps cannot delete
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      const canDelete = await this.rbac.canDeleteResource(deal, rbacContext);
      if (!canDelete) {
        throw new ForbiddenException('لا يمكنك حذف الصفقات');
      }
    }

    await this.prisma.deal.delete({
      where: { id },
    });

    return { message: 'تم حذف الصفقة بنجاح' };
  }

  // Get deals grouped by stage for Kanban board
  async getKanbanBoard(tenantId: string, pipelineId: string, userId?: string, userRole?: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('خط المبيعات غير موجود');
    }

    // Get RBAC ownership filter
    let ownershipFilter = {};
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      ownershipFilter = await this.rbac.getOwnershipFilter(rbacContext);
    }

    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        pipelineId,
        status: 'open',
        ...ownershipFilter,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group deals by stage
    const stages = pipeline.stages.map((stage) => ({
      ...stage,
      deals: deals.filter((deal) => deal.stageId === stage.id),
      totalValue: deals
        .filter((deal) => deal.stageId === stage.id)
        .reduce((sum, deal) => sum + Number(deal.value), 0),
    }));

    return {
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
      },
      stages,
      summary: {
        totalDeals: deals.length,
        totalValue: deals.reduce((sum, deal) => sum + Number(deal.value), 0),
      },
    };
  }

  // Get deal statistics
  async getStatistics(tenantId: string, userId?: string, userRole?: string, pipelineId?: string) {
    // Get RBAC ownership filter
    let ownershipFilter = {};
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      ownershipFilter = await this.rbac.getOwnershipFilter(rbacContext);
    }

    const where: Prisma.DealWhereInput = {
      tenantId,
      ...ownershipFilter,
      ...(pipelineId && { pipelineId }),
    };

    const [openDeals, wonDeals, lostDeals] = await Promise.all([
      this.prisma.deal.aggregate({
        where: { ...where, status: 'open' },
        _count: true,
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { ...where, status: 'won' },
        _count: true,
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { ...where, status: 'lost' },
        _count: true,
        _sum: { value: true },
      }),
    ]);

    const totalWonAndLost = wonDeals._count + lostDeals._count;
    const winRate = totalWonAndLost > 0 ? (wonDeals._count / totalWonAndLost) * 100 : 0;

    return {
      open: {
        count: openDeals._count,
        value: Number(openDeals._sum.value) || 0,
      },
      won: {
        count: wonDeals._count,
        value: Number(wonDeals._sum.value) || 0,
      },
      lost: {
        count: lostDeals._count,
        value: Number(lostDeals._sum.value) || 0,
      },
      winRate: Math.round(winRate * 100) / 100,
    };
  }
}
