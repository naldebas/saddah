// src/modules/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RbacService, RbacContext } from '@/common/services/rbac.service';
import { ReportQueryDto, ReportPeriod } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  private getDateRange(query: ReportQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (query.period) {
      case ReportPeriod.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case ReportPeriod.YESTERDAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case ReportPeriod.THIS_WEEK:
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
        break;
      case ReportPeriod.LAST_WEEK:
        const lastWeekDay = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay - 7, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay - 1, 23, 59, 59);
        break;
      case ReportPeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case ReportPeriod.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case ReportPeriod.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0);
        break;
      case ReportPeriod.LAST_QUARTER:
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const qStart = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(year, qStart * 3, 1, 0, 0, 0);
        endDate = new Date(year, (qStart + 1) * 3, 0, 23, 59, 59);
        break;
      case ReportPeriod.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      case ReportPeriod.LAST_YEAR:
        startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case ReportPeriod.CUSTOM:
        startDate = query.startDate ? new Date(query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = query.endDate ? new Date(query.endDate) : now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  // ============================================
  // SALES REPORT
  // ============================================

  async getSalesReport(tenantId: string, userId: string, userRole: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build ownerId filter: admin can filter by any userId in query, others are restricted
    let ownerFilter = {};
    if (allowedUserIds !== null) {
      // Non-admin: restrict to allowed users
      ownerFilter = { ownerId: { in: allowedUserIds } };
    } else if (query.userId) {
      // Admin with specific user filter
      ownerFilter = { ownerId: query.userId };
    }

    const whereClause: Prisma.DealWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...ownerFilter,
      ...(query.pipelineId && { pipelineId: query.pipelineId }),
    };

    // Get deals summary
    const [totalDeals, wonDeals, lostDeals, openDeals] = await Promise.all([
      this.prisma.deal.count({ where: whereClause }),
      this.prisma.deal.aggregate({
        where: { ...whereClause, status: 'won' },
        _count: { id: true },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { ...whereClause, status: 'lost' },
        _count: { id: true },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { ...whereClause, status: 'open' },
        _count: { id: true },
        _sum: { value: true },
      }),
    ]);

    // Get deals by stage
    const dealsByStage = await this.prisma.deal.groupBy({
      by: ['stageId'],
      where: { ...whereClause, status: 'open' },
      _count: { id: true },
      _sum: { value: true },
    });

    const stageIds = dealsByStage.map(d => d.stageId);
    const stages = await this.prisma.pipelineStage.findMany({
      where: { id: { in: stageIds } },
    });
    const stageMap = new Map(stages.map(s => [s.id, s]));

    // Get sales by user
    const salesByUser = await this.prisma.deal.groupBy({
      by: ['ownerId'],
      where: { ...whereClause, status: 'won' },
      _count: { id: true },
      _sum: { value: true },
    });

    const userIds = salesByUser.map(s => s.ownerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Calculate conversion rate
    const closedDeals = (wonDeals._count.id || 0) + (lostDeals._count.id || 0);
    const conversionRate = closedDeals > 0 ? ((wonDeals._count.id || 0) / closedDeals) * 100 : 0;

    // Average deal value
    const avgDealValue = (wonDeals._count.id || 0) > 0
      ? Number(wonDeals._sum.value || 0) / wonDeals._count.id
      : 0;

    return {
      period: { startDate, endDate },
      summary: {
        totalDeals,
        wonDeals: wonDeals._count.id || 0,
        wonValue: Number(wonDeals._sum.value || 0),
        lostDeals: lostDeals._count.id || 0,
        lostValue: Number(lostDeals._sum.value || 0),
        openDeals: openDeals._count.id || 0,
        openValue: Number(openDeals._sum.value || 0),
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDealValue: Math.round(avgDealValue),
      },
      byStage: dealsByStage.map(d => ({
        stageId: d.stageId,
        stageName: stageMap.get(d.stageId)?.name || 'غير محدد',
        stageColor: stageMap.get(d.stageId)?.color || '#6B7280',
        count: d._count.id,
        value: Number(d._sum.value || 0),
      })),
      byUser: salesByUser.map(s => {
        const user = userMap.get(s.ownerId);
        return {
          userId: s.ownerId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'غير معروف',
          dealsWon: s._count.id,
          totalValue: Number(s._sum.value || 0),
        };
      }).sort((a, b) => b.totalValue - a.totalValue),
    };
  }

  // ============================================
  // LEADS REPORT
  // ============================================

  async getLeadsReport(tenantId: string, userId: string, userRole: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build ownerId filter
    let ownerFilter = {};
    if (allowedUserIds !== null) {
      ownerFilter = { ownerId: { in: allowedUserIds } };
    } else if (query.userId) {
      ownerFilter = { ownerId: query.userId };
    }

    const whereClause: Prisma.LeadWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...ownerFilter,
    };

    // Get leads summary
    const [totalLeads, statusCounts, sourceCounts, convertedLeads] = await Promise.all([
      this.prisma.lead.count({ where: whereClause }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: whereClause,
        _count: { id: true },
      }),
      this.prisma.lead.count({
        where: {
          ...whereClause,
          convertedAt: { not: null },
        },
      }),
    ]);

    // Leads by score grade
    const leadsByGrade = await this.prisma.lead.groupBy({
      by: ['scoreGrade'],
      where: whereClause,
      _count: { id: true },
    });

    // Average score
    const avgScore = await this.prisma.lead.aggregate({
      where: whereClause,
      _avg: { score: true },
    });

    // Conversion rate
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const statusLabels: Record<string, string> = {
      new: 'جديد',
      contacted: 'تم التواصل',
      qualified: 'مؤهل',
      unqualified: 'غير مؤهل',
      converted: 'محوّل',
    };

    const sourceLabels: Record<string, string> = {
      manual: 'يدوي',
      website: 'الموقع الإلكتروني',
      whatsapp: 'واتساب',
      instagram: 'إنستغرام',
      facebook: 'فيسبوك',
      referral: 'إحالة',
      aqar: 'عقار',
      haraj: 'حراج',
    };

    const gradeLabels: Record<string, string> = {
      A: 'ممتاز (A)',
      B: 'جيد (B)',
      C: 'متوسط (C)',
      D: 'ضعيف (D)',
    };

    return {
      period: { startDate, endDate },
      summary: {
        totalLeads,
        convertedLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgScore: Math.round(avgScore._avg.score || 0),
      },
      byStatus: statusCounts.map(s => ({
        status: s.status,
        statusLabel: statusLabels[s.status] || s.status,
        count: s._count.id,
        percentage: totalLeads > 0 ? Math.round((s._count.id / totalLeads) * 1000) / 10 : 0,
      })),
      bySource: sourceCounts.map(s => ({
        source: s.source,
        sourceLabel: sourceLabels[s.source] || s.source,
        count: s._count.id,
        percentage: totalLeads > 0 ? Math.round((s._count.id / totalLeads) * 1000) / 10 : 0,
      })),
      byGrade: leadsByGrade
        .filter(g => g.scoreGrade)
        .map(g => ({
          grade: g.scoreGrade,
          gradeLabel: gradeLabels[g.scoreGrade || ''] || g.scoreGrade,
          count: g._count.id,
          percentage: totalLeads > 0 ? Math.round((g._count.id / totalLeads) * 1000) / 10 : 0,
        })),
    };
  }

  // ============================================
  // ACTIVITIES REPORT
  // ============================================

  async getActivitiesReport(tenantId: string, userId: string, userRole: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build createdById filter (activities use createdById instead of ownerId)
    let createdByFilter = {};
    if (allowedUserIds !== null) {
      createdByFilter = { createdById: { in: allowedUserIds } };
    } else if (query.userId) {
      createdByFilter = { createdById: query.userId };
    }

    const whereClause: Prisma.ActivityWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...createdByFilter,
    };

    // Get activities summary
    const [totalActivities, completedActivities, overdueActivities, typeCounts] = await Promise.all([
      this.prisma.activity.count({ where: whereClause }),
      this.prisma.activity.count({ where: { ...whereClause, isCompleted: true } }),
      this.prisma.activity.count({
        where: {
          ...whereClause,
          isCompleted: false,
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.activity.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { id: true },
      }),
    ]);

    // Activities by user
    const activitiesByUser = await this.prisma.activity.groupBy({
      by: ['createdById'],
      where: whereClause,
      _count: { id: true },
    });

    const userIds = activitiesByUser.map(a => a.createdById);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Completed by user
    const completedByUser = await this.prisma.activity.groupBy({
      by: ['createdById'],
      where: { ...whereClause, isCompleted: true },
      _count: { id: true },
    });
    const completedMap = new Map(completedByUser.map(c => [c.createdById, c._count.id]));

    // Completion rate
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    const typeLabels: Record<string, string> = {
      call: 'مكالمة',
      meeting: 'اجتماع',
      email: 'بريد إلكتروني',
      task: 'مهمة',
      note: 'ملاحظة',
      visit: 'زيارة',
    };

    return {
      period: { startDate, endDate },
      summary: {
        totalActivities,
        completedActivities,
        overdueActivities,
        completionRate: Math.round(completionRate * 10) / 10,
      },
      byType: typeCounts.map(t => ({
        type: t.type,
        typeLabel: typeLabels[t.type] || t.type,
        count: t._count.id,
        percentage: totalActivities > 0 ? Math.round((t._count.id / totalActivities) * 1000) / 10 : 0,
      })),
      byUser: activitiesByUser.map(a => {
        const user = userMap.get(a.createdById);
        const completed = completedMap.get(a.createdById) || 0;
        return {
          userId: a.createdById,
          userName: user ? `${user.firstName} ${user.lastName}` : 'غير معروف',
          totalActivities: a._count.id,
          completedActivities: completed,
          completionRate: a._count.id > 0 ? Math.round((completed / a._count.id) * 1000) / 10 : 0,
        };
      }).sort((a, b) => b.totalActivities - a.totalActivities),
    };
  }

  // ============================================
  // CONTACTS REPORT
  // ============================================

  async getContactsReport(tenantId: string, userId: string, userRole: string, query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build ownerId filter
    let ownerFilter = {};
    if (allowedUserIds !== null) {
      ownerFilter = { ownerId: { in: allowedUserIds } };
    } else if (query.userId) {
      ownerFilter = { ownerId: query.userId };
    }

    const whereClause: Prisma.ContactWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...ownerFilter,
    };

    const [totalContacts, sourceCounts, contactsWithDeals] = await Promise.all([
      this.prisma.contact.count({ where: whereClause }),
      this.prisma.contact.groupBy({
        by: ['source'],
        where: whereClause,
        _count: { id: true },
      }),
      this.prisma.contact.count({
        where: {
          ...whereClause,
          deals: { some: {} },
        },
      }),
    ]);

    // Contacts by owner
    const contactsByOwner = await this.prisma.contact.groupBy({
      by: ['ownerId'],
      where: whereClause,
      _count: { id: true },
    });

    const userIds = contactsByOwner.map(c => c.ownerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const sourceLabels: Record<string, string> = {
      manual: 'يدوي',
      website: 'الموقع الإلكتروني',
      whatsapp: 'واتساب',
      instagram: 'إنستغرام',
      facebook: 'فيسبوك',
      referral: 'إحالة',
      import: 'استيراد',
    };

    return {
      period: { startDate, endDate },
      summary: {
        totalContacts,
        contactsWithDeals,
        engagementRate: totalContacts > 0 ? Math.round((contactsWithDeals / totalContacts) * 1000) / 10 : 0,
      },
      bySource: sourceCounts.map(s => ({
        source: s.source,
        sourceLabel: sourceLabels[s.source] || s.source,
        count: s._count.id,
        percentage: totalContacts > 0 ? Math.round((s._count.id / totalContacts) * 1000) / 10 : 0,
      })),
      byOwner: contactsByOwner.map(c => {
        const user = userMap.get(c.ownerId);
        return {
          userId: c.ownerId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'غير معروف',
          count: c._count.id,
        };
      }).sort((a, b) => b.count - a.count),
    };
  }

  // ============================================
  // EXPORT DATA
  // ============================================

  async exportDeals(tenantId: string, userId: string, userRole: string, query: ReportQueryDto): Promise<string> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build ownerId filter
    let ownerFilter = {};
    if (allowedUserIds !== null) {
      ownerFilter = { ownerId: { in: allowedUserIds } };
    } else if (query.userId) {
      ownerFilter = { ownerId: query.userId };
    }

    const whereClause: Prisma.DealWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...ownerFilter,
      ...(query.pipelineId && { pipelineId: query.pipelineId }),
    };

    const deals = await this.prisma.deal.findMany({
      where: whereClause,
      include: {
        owner: { select: { firstName: true, lastName: true } },
        contact: { select: { firstName: true, lastName: true } },
        stage: { select: { name: true } },
        pipeline: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['العنوان', 'القيمة', 'العملة', 'الحالة', 'المرحلة', 'المسار', 'المالك', 'العميل', 'تاريخ الإنشاء', 'تاريخ الإغلاق'];
    const rows = deals.map(d => [
      d.title,
      d.value.toString(),
      d.currency,
      d.status === 'won' ? 'مكسوبة' : d.status === 'lost' ? 'خاسرة' : 'مفتوحة',
      d.stage.name,
      d.pipeline.name,
      `${d.owner.firstName} ${d.owner.lastName}`,
      d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : '',
      d.createdAt.toISOString().split('T')[0],
      d.closedAt ? d.closedAt.toISOString().split('T')[0] : '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async exportLeads(tenantId: string, userId: string, userRole: string, query: ReportQueryDto): Promise<string> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build ownerId filter
    let ownerFilter = {};
    if (allowedUserIds !== null) {
      ownerFilter = { ownerId: { in: allowedUserIds } };
    } else if (query.userId) {
      ownerFilter = { ownerId: query.userId };
    }

    const whereClause: Prisma.LeadWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...ownerFilter,
    };

    const leads = await this.prisma.lead.findMany({
      where: whereClause,
      include: {
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['الاسم', 'الجوال', 'البريد', 'المصدر', 'الحالة', 'النقاط', 'التصنيف', 'نوع العقار', 'الميزانية', 'المالك', 'تاريخ الإنشاء'];
    const rows = leads.map(l => [
      `${l.firstName} ${l.lastName || ''}`.trim(),
      l.phone || '',
      l.email || '',
      l.source,
      l.status,
      l.score.toString(),
      l.scoreGrade || '',
      l.propertyType || '',
      l.budget?.toString() || '',
      l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : '',
      l.createdAt.toISOString().split('T')[0],
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async exportActivities(tenantId: string, userId: string, userRole: string, query: ReportQueryDto): Promise<string> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get RBAC user filter
    const rbacContext: RbacContext = { userId, userRole, tenantId };
    const allowedUserIds = await this.rbac.getReportUserIds(rbacContext);

    // Build createdById filter
    let createdByFilter = {};
    if (allowedUserIds !== null) {
      createdByFilter = { createdById: { in: allowedUserIds } };
    } else if (query.userId) {
      createdByFilter = { createdById: query.userId };
    }

    const whereClause: Prisma.ActivityWhereInput = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      ...createdByFilter,
    };

    const activities = await this.prisma.activity.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const typeLabels: Record<string, string> = {
      call: 'مكالمة',
      meeting: 'اجتماع',
      email: 'بريد إلكتروني',
      task: 'مهمة',
      note: 'ملاحظة',
      visit: 'زيارة',
    };

    const headers = ['النوع', 'الموضوع', 'الوصف', 'العميل', 'الصفقة', 'المنشئ', 'تاريخ الاستحقاق', 'مكتمل', 'تاريخ الإنشاء'];
    const rows = activities.map(a => [
      typeLabels[a.type] || a.type,
      a.subject || '',
      a.description || '',
      a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : '',
      a.deal?.title || '',
      `${a.createdBy.firstName} ${a.createdBy.lastName}`,
      a.dueDate?.toISOString().split('T')[0] || '',
      a.isCompleted ? 'نعم' : 'لا',
      a.createdAt.toISOString().split('T')[0],
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
