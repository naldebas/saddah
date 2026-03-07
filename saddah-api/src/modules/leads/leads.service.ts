import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { ScoreLeadDto } from './dto/score-lead.dto';
import { LeadRecommendationsService } from './lead-recommendations.service';
import { LeadAssignmentService } from './lead-assignment.service';

// Roles that can see all leads
const FULL_ACCESS_ROLES = ['admin', 'manager', 'sales_manager'];

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private recommendationsService: LeadRecommendationsService,
    private assignmentService: LeadAssignmentService,
  ) {}

  /**
   * Check if user has access to view a specific lead
   */
  private canAccessLead(lead: { ownerId: string | null }, userId: string, userRole: string): boolean {
    // Admin and manager can access all leads
    if (FULL_ACCESS_ROLES.includes(userRole)) {
      return true;
    }
    // Other roles can only access their own leads
    return lead.ownerId === userId;
  }

  /**
   * Check if user can edit a specific lead
   * - Admin: can edit all
   * - Sales Manager: can edit own and team's leads
   * - Sales Rep: can only edit their own leads
   */
  private canEditLead(lead: { ownerId: string | null }, userId: string, userRole: string): boolean {
    if (userRole === 'admin') {
      return true;
    }
    if (userRole === 'sales_manager') {
      // Manager can edit their own leads (team check would require additional query)
      return true; // For now, allow managers to edit any lead they can see
    }
    // Sales rep can only edit their own leads
    return lead.ownerId === userId;
  }

  /**
   * Check if user can delete a specific lead
   * - Admin: can delete all
   * - Sales Manager: can delete own and team's leads
   * - Sales Rep: CANNOT delete any leads
   */
  private canDeleteLead(lead: { ownerId: string | null }, userId: string, userRole: string): boolean {
    if (userRole === 'admin') {
      return true;
    }
    if (userRole === 'sales_manager') {
      return true; // Manager can delete leads they manage
    }
    // Sales rep cannot delete
    return false;
  }

  /**
   * Get ownership filter based on user role
   */
  private getOwnershipFilter(userId: string, userRole: string): Prisma.LeadWhereInput {
    // Admin and manager see all leads
    if (FULL_ACCESS_ROLES.includes(userRole)) {
      return {};
    }
    // Other roles see only their own leads
    return { ownerId: userId };
  }

  /**
   * Calculate lead score automatically based on provided data
   * Returns score (0-100) and grade (A/B/C/D)
   */
  private calculateLeadScore(data: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    budget?: number;
    propertyType?: string;
    timeline?: string;
    location?: string;
    financingNeeded?: boolean;
    notes?: string;
  }): { score: number; grade: string; factors: Record<string, number> } {
    const factors: Record<string, number> = {};
    let totalScore = 0;

    // معلومات الاتصال (25 نقطة)
    if (data.email) {
      factors.email = 10;
      totalScore += 10;
    }
    if (data.phone) {
      factors.phone = 10;
      totalScore += 10;
    }
    if (data.whatsapp) {
      factors.whatsapp = 5;
      totalScore += 5;
    }

    // الميزانية (25 نقطة) - ميزانية أعلى = نقاط أكثر
    if (data.budget) {
      let budgetScore = 10;
      if (data.budget >= 500000) budgetScore = 15;
      if (data.budget >= 1000000) budgetScore = 20;
      if (data.budget >= 2000000) budgetScore = 25;
      factors.budget = budgetScore;
      totalScore += budgetScore;
    }

    // نوع العقار (15 نقطة)
    if (data.propertyType) {
      factors.propertyType = 15;
      totalScore += 15;
    }

    // الجدول الزمني (20 نقطة) - وقت أقصر = نقاط أكثر
    if (data.timeline) {
      let timelineScore = 10;
      const timeline = data.timeline.toLowerCase();
      if (timeline.includes('immediate') || timeline.includes('فوري') || timeline.includes('1_month')) {
        timelineScore = 20;
      } else if (timeline.includes('3_month') || timeline.includes('1-3')) {
        timelineScore = 15;
      } else if (timeline.includes('6_month')) {
        timelineScore = 10;
      }
      factors.timeline = timelineScore;
      totalScore += timelineScore;
    }

    // الموقع (10 نقاط)
    if (data.location) {
      factors.location = 10;
      totalScore += 10;
    }

    // التمويل محدد (5 نقاط)
    if (data.financingNeeded !== undefined) {
      factors.financing = 5;
      totalScore += 5;
    }

    // Ensure score is between 0-100
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Calculate grade
    let grade = 'D';
    if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 60) grade = 'B';
    else if (totalScore >= 40) grade = 'C';

    return { score: totalScore, grade, factors };
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto) {
    // Calculate automatic score
    const { score, grade, factors } = this.calculateLeadScore(dto);

    // Determine owner: explicit > auto-assign (round-robin) > current user
    let ownerId = dto.ownerId;

    if (!ownerId) {
      // Auto-assign using round-robin
      const assignedUserId = await this.assignmentService.getNextAssignee(tenantId);
      ownerId = assignedUserId || userId; // Fallback to current user if no assignees available
    }

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        ownerId,
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
        score,
        scoreGrade: grade,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create initial score history
    await this.prisma.leadScoreHistory.create({
      data: {
        leadId: lead.id,
        score,
        grade,
        factors,
      },
    });

    return lead;
  }

  async findAll(tenantId: string, userId: string, userRole: string, query: QueryLeadsDto) {
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

    // For non-admin roles, force ownerId filter to current user
    // Admin/manager can filter by any ownerId or see all
    const isFullAccess = FULL_ACCESS_ROLES.includes(userRole);
    const ownerIdFilter = isFullAccess
      ? (ownerId ? { ownerId } : {})
      : { ownerId: userId };

    const where: Prisma.LeadWhereInput = {
      tenantId,
      ...ownerIdFilter,
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

  async findOne(tenantId: string, id: string, userId?: string, userRole?: string) {
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

    // Check access permissions if userId and role are provided
    if (userId && userRole && !this.canAccessLead(lead, userId, userRole)) {
      throw new ForbiddenException('لا يمكنك الوصول إلى هذا العميل المحتمل');
    }

    // Generate AI recommendations
    const recommendations = this.recommendationsService.generateRecommendations(lead);

    return {
      ...lead,
      recommendations,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, userId?: string, userRole?: string) {
    const existingLead = await this.findOne(tenantId, id, userId, userRole);

    // Check edit permission
    if (userId && userRole && !this.canEditLead(existingLead, userId, userRole)) {
      throw new ForbiddenException('لا يمكنك تعديل هذا العميل المحتمل');
    }

    // Merge existing data with updates for score calculation
    const mergedData = {
      email: dto.email ?? existingLead.email ?? undefined,
      phone: dto.phone ?? existingLead.phone ?? undefined,
      whatsapp: dto.whatsapp ?? existingLead.whatsapp ?? undefined,
      budget: dto.budget ?? (existingLead.budget ? Number(existingLead.budget) : undefined),
      propertyType: dto.propertyType ?? existingLead.propertyType ?? undefined,
      timeline: dto.timeline ?? existingLead.timeline ?? undefined,
      location: dto.location ?? existingLead.location ?? undefined,
      financingNeeded: dto.financingNeeded ?? existingLead.financingNeeded ?? undefined,
      notes: dto.notes ?? existingLead.notes ?? undefined,
    };

    // Recalculate score with merged data
    const { score, grade, factors } = this.calculateLeadScore(mergedData);

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        score,
        scoreGrade: grade,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Record score change in history if score changed
    if (score !== existingLead.score) {
      await this.prisma.leadScoreHistory.create({
        data: {
          leadId: id,
          score,
          grade,
          factors,
        },
      });
    }

    return updatedLead;
  }

  async updateStatus(tenantId: string, id: string, status: LeadStatus, userId?: string, userRole?: string) {
    await this.findOne(tenantId, id, userId, userRole);

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

  async score(tenantId: string, id: string, dto: ScoreLeadDto, userId?: string, userRole?: string) {
    await this.findOne(tenantId, id, userId, userRole);

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

  async convert(tenantId: string, id: string, userId: string, userRole: string, dto: ConvertLeadDto) {
    const lead = await this.findOne(tenantId, id, userId, userRole);

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

  async remove(tenantId: string, id: string, userId?: string, userRole?: string) {
    const lead = await this.findOne(tenantId, id, userId, userRole);

    // Check delete permission - sales reps cannot delete
    if (userId && userRole && !this.canDeleteLead(lead, userId, userRole)) {
      throw new ForbiddenException('لا يمكنك حذف العملاء المحتملين');
    }

    await this.prisma.lead.delete({
      where: { id },
    });

    return { message: 'تم حذف العميل المحتمل بنجاح' };
  }

  async getStatistics(tenantId: string, userId?: string, userRole?: string) {
    // Get ownership filter based on role
    const ownershipFilter = userId && userRole
      ? this.getOwnershipFilter(userId, userRole)
      : {};

    const baseWhere = { tenantId, ...ownershipFilter };

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      leadsBySource,
      leadsByPropertyType,
      avgScore,
    ] = await Promise.all([
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.count({ where: { ...baseWhere, status: 'new' } }),
      this.prisma.lead.count({ where: { ...baseWhere, status: 'qualified' } }),
      this.prisma.lead.count({ where: { ...baseWhere, status: 'converted' } }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['propertyType'],
        where: { ...baseWhere, propertyType: { not: null } },
        _count: { id: true },
      }),
      this.prisma.lead.aggregate({
        where: baseWhere,
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
