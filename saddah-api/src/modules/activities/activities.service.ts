// src/modules/activities/activities.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RbacService, RbacContext } from '@/common/services/rbac.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateActivityDto) {
    // Validate contact exists if provided
    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, tenantId, isActive: true },
      });
      if (!contact) {
        throw new NotFoundException('جهة الاتصال غير موجودة');
      }
    }

    // Validate deal exists if provided
    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, tenantId },
      });
      if (!deal) {
        throw new NotFoundException('الصفقة غير موجودة');
      }
    }

    return this.prisma.activity.create({
      data: {
        tenantId,
        createdById: userId,
        contactId: dto.contactId,
        dealId: dto.dealId,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        duration: dto.duration,
        metadata: dto.metadata || {},
      },
      include: {
        createdBy: {
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, userId: string, userRole: string, query: QueryActivitiesDto) {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      contactId,
      dealId,
      createdById,
      isCompleted,
      dueDateFrom,
      dueDateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Get RBAC createdBy filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const createdByFilter = await this.rbac.getCreatedByFilter(rbacContext);

    // Admin can filter by any createdById, others are restricted
    const effectiveCreatedByFilter = this.rbac.isAdmin(userRole) && createdById
      ? { createdById }
      : createdByFilter;

    // Build dueDate filter
    const dueDateFilter: Prisma.DateTimeNullableFilter | undefined =
      dueDateFrom || dueDateTo
        ? {
            ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
            ...(dueDateTo && { lte: new Date(dueDateTo) }),
          }
        : undefined;

    const where: Prisma.ActivityWhereInput = {
      tenantId,
      ...effectiveCreatedByFilter,
      ...(search && {
        OR: [
          { subject: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(type && { type }),
      ...(contactId && { contactId }),
      ...(dealId && { dealId }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(dueDateFilter && { dueDate: dueDateFilter }),
    };

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
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
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string, userId?: string, userRole?: string) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contact: true,
        deal: {
          include: {
            stage: true,
            pipeline: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('النشاط غير موجود');
    }

    // Check access permissions
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      // Activities use createdById instead of ownerId
      const activityWithOwner = { ...activity, ownerId: activity.createdById };
      const canAccess = await this.rbac.canAccessResource(activityWithOwner, rbacContext);
      if (!canAccess) {
        throw new ForbiddenException('لا يمكنك الوصول إلى هذا النشاط');
      }
    }

    return activity;
  }

  async update(tenantId: string, id: string, dto: UpdateActivityDto, userId?: string, userRole?: string) {
    const activity = await this.findOne(tenantId, id, userId, userRole);

    // Check edit permission - sales reps can only edit their own activities
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      const canEdit = await this.rbac.canEditResource(activity, rbacContext);
      if (!canEdit) {
        throw new ForbiddenException('لا يمكنك تعديل هذا النشاط');
      }
    }

    // Validate contact exists if being updated
    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, tenantId, isActive: true },
      });
      if (!contact) {
        throw new NotFoundException('جهة الاتصال غير موجودة');
      }
    }

    // Validate deal exists if being updated
    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, tenantId },
      });
      if (!deal) {
        throw new NotFoundException('الصفقة غير موجودة');
      }
    }

    return this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.contactId !== undefined && { contactId: dto.contactId }),
        ...(dto.dealId !== undefined && { dealId: dto.dealId }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
      include: {
        createdBy: {
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async complete(tenantId: string, id: string, dto: CompleteActivityDto, userId?: string, userRole?: string) {
    const activity = await this.findOne(tenantId, id, userId, userRole);

    if (activity.isCompleted) {
      throw new BadRequestException('النشاط مكتمل بالفعل');
    }

    return this.prisma.activity.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        outcome: dto.outcome,
        ...(dto.duration !== undefined && { duration: dto.duration }),
      },
      include: {
        createdBy: {
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async uncomplete(tenantId: string, id: string, userId?: string, userRole?: string) {
    const activity = await this.findOne(tenantId, id, userId, userRole);

    if (!activity.isCompleted) {
      throw new BadRequestException('النشاط غير مكتمل');
    }

    return this.prisma.activity.update({
      where: { id },
      data: {
        isCompleted: false,
        completedAt: null,
        outcome: null,
      },
      include: {
        createdBy: {
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string, userId?: string, userRole?: string) {
    const activity = await this.findOne(tenantId, id, userId, userRole);

    // Check delete permission - sales reps cannot delete activities
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      const canDelete = await this.rbac.canDeleteResource(activity, rbacContext);
      if (!canDelete) {
        throw new ForbiddenException('لا يمكنك حذف الأنشطة');
      }
    }

    await this.prisma.activity.delete({
      where: { id },
    });

    return { message: 'تم حذف النشاط بنجاح' };
  }

  // Get upcoming activities (due today or overdue)
  async getUpcoming(tenantId: string, userId?: string, userRole?: string, limit = 10) {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Get RBAC createdBy filter
    let createdByFilter = {};
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      createdByFilter = await this.rbac.getCreatedByFilter(rbacContext);
    }

    const where: Prisma.ActivityWhereInput = {
      tenantId,
      isCompleted: false,
      dueDate: {
        lte: endOfDay,
      },
      ...createdByFilter,
    };

    return this.prisma.activity.findMany({
      where,
      take: limit,
      orderBy: { dueDate: 'asc' },
      include: {
        createdBy: {
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // Get activity statistics
  async getStatistics(tenantId: string, userId?: string, userRole?: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Get RBAC createdBy filter
    let createdByFilter = {};
    if (userId && userRole) {
      const rbacContext: RbacContext = { userId, userRole, tenantId };
      createdByFilter = await this.rbac.getCreatedByFilter(rbacContext);
    }

    const where: Prisma.ActivityWhereInput = {
      tenantId,
      ...createdByFilter,
    };

    const [
      totalPending,
      overdue,
      dueToday,
      completedToday,
      byType,
    ] = await Promise.all([
      // Total pending activities
      this.prisma.activity.count({
        where: { ...where, isCompleted: false },
      }),
      // Overdue activities
      this.prisma.activity.count({
        where: {
          ...where,
          isCompleted: false,
          dueDate: { lt: startOfDay },
        },
      }),
      // Due today
      this.prisma.activity.count({
        where: {
          ...where,
          isCompleted: false,
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      // Completed today
      this.prisma.activity.count({
        where: {
          ...where,
          isCompleted: true,
          completedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      // Group by type
      this.prisma.activity.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalPending,
      overdue,
      dueToday,
      completedToday,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }

  // Get activity timeline for a contact or deal
  async getTimeline(
    tenantId: string,
    options: { contactId?: string; dealId?: string; limit?: number },
  ) {
    const { contactId, dealId, limit = 20 } = options;

    if (!contactId && !dealId) {
      throw new BadRequestException('يجب تحديد جهة الاتصال أو الصفقة');
    }

    const where: Prisma.ActivityWhereInput = {
      tenantId,
      ...(contactId && { contactId }),
      ...(dealId && { dealId }),
    };

    return this.prisma.activity.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
