import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { ScoreLeadDto } from './dto/score-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        ownerId: dto.ownerId || userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        source: dto.source || 'manual',
        sourceId: dto.sourceId,
        propertyType: dto.propertyType,
        budget: dto.budget,
        timeline: dto.timeline,
        location: dto.location,
        financingNeeded: dto.financingNeeded,
        notes: dto.notes,
        tags: dto.tags || [],
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findAll(tenantId: string, query: QueryLeadsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      source,
      propertyType,
      ownerId,
      minScore,
      maxScore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build score filter
    const scoreFilter: Prisma.IntFilter | undefined =
      minScore !== undefined || maxScore !== undefined
        ? {
            ...(minScore !== undefined && { gte: minScore }),
            ...(maxScore !== undefined && { lte: maxScore }),
          }
        : undefined;

    const where: Prisma.LeadWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
      ...(status && { status }),
      ...(source && { source }),
      ...(propertyType && { propertyType }),
      ...(ownerId && { ownerId }),
      ...(scoreFilter && { score: scoreFilter }),
    };

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        scoreHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('العميل المحتمل غير موجود');
    }

    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    await this.findOne(tenantId, id);

    return this.prisma.lead.update({
      where: { id },
      data: dto,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: LeadStatus) {
    await this.findOne(tenantId, id);

    return this.prisma.lead.update({
      where: { id },
      data: { status },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async score(tenantId: string, id: string, dto: ScoreLeadDto) {
    const lead = await this.findOne(tenantId, id);

    // Update lead score and create history entry
    const [updatedLead] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id },
        data: {
          score: dto.score,
          scoreGrade: dto.grade,
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.leadScoreHistory.create({
        data: {
          leadId: id,
          score: dto.score,
          grade: dto.grade,
          factors: dto.factors,
        },
      }),
    ]);

    return updatedLead;
  }

  async convert(tenantId: string, id: string, userId: string, dto: ConvertLeadDto) {
    const lead = await this.findOne(tenantId, id);

    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('تم تحويل هذا العميل المحتمل مسبقاً');
    }

    // Create contact from lead
    const contact = await this.prisma.contact.create({
      data: {
        tenantId,
        ownerId: lead.ownerId || userId,
        firstName: lead.firstName,
        lastName: lead.lastName || '',
        email: lead.email,
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        companyId: dto.companyId,
        source: lead.source,
        tags: lead.tags,
      },
    });

    let deal = null;

    // Create deal if pipeline is specified
    if (dto.pipelineId) {
      // Get the first stage of the pipeline
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { pipelineId: dto.pipelineId },
        orderBy: { order: 'asc' },
      });

      if (!firstStage) {
        throw new BadRequestException('مسار المبيعات لا يحتوي على مراحل');
      }

      deal = await this.prisma.deal.create({
        data: {
          tenantId,
          ownerId: lead.ownerId || userId,
          contactId: contact.id,
          companyId: dto.companyId,
          pipelineId: dto.pipelineId,
          stageId: firstStage.id,
          title: dto.dealTitle || `صفقة ${lead.firstName} ${lead.lastName || ''}`.trim(),
          value: lead.budget || 0,
          probability: firstStage.probability,
        },
      });
    }

    // Update lead as converted
    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        status: LeadStatus.CONVERTED,
        convertedAt: new Date(),
        convertedToContactId: contact.id,
        convertedToDealId: deal?.id,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      lead: updatedLead,
      contact,
      deal,
    };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.lead.delete({
      where: { id },
    });

    return { message: 'تم حذف العميل المحتمل بنجاح' };
  }

  async getStatistics(tenantId: string) {
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      leadsBySource,
      leadsByPropertyType,
      avgScore,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, status: 'new' } }),
      this.prisma.lead.count({ where: { tenantId, status: 'qualified' } }),
      this.prisma.lead.count({ where: { tenantId, status: 'converted' } }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['propertyType'],
        where: { tenantId, propertyType: { not: null } },
        _count: { id: true },
      }),
      this.prisma.lead.aggregate({
        where: { tenantId },
        _avg: { score: true },
      }),
    ]);

    return {
      total: totalLeads,
      byStatus: {
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
      },
      bySource: leadsBySource.map((item) => ({
        source: item.source,
        count: item._count.id,
      })),
      byPropertyType: leadsByPropertyType.map((item) => ({
        propertyType: item.propertyType,
        count: item._count.id,
      })),
      averageScore: Math.round(avgScore._avg.score || 0),
      conversionRate: totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 100)
        : 0,
    };
  }
}
