// src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface DashboardStats {
  totalContacts: number;
  totalDeals: number;
  totalLeads: number;
  totalCompanies: number;
  openDealsValue: number;
  wonDealsValue: number;
  conversionRate: number;
  newLeadsThisMonth: number;
}

export interface DealsByStage {
  stageName: string;
  stageColor: string;
  count: number;
  value: number;
}

export interface LeadsBySource {
  source: string;
  count: number;
  percentage: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  subject: string;
  createdAt: Date;
  contactName?: string;
  dealTitle?: string;
}

export interface SalesPerformance {
  userId: string;
  userName: string;
  dealsWon: number;
  totalValue: number;
  activitiesCompleted: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string): Promise<DashboardStats> {
    const [
      totalContacts,
      totalDeals,
      totalLeads,
      totalCompanies,
      openDeals,
      wonDeals,
      newLeadsThisMonth,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId, isActive: true } }),
      this.prisma.deal.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.company.count({ where: { tenantId, isActive: true } }),
      this.prisma.deal.aggregate({
        where: { tenantId, status: 'open' },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { tenantId, status: 'won' },
        _sum: { value: true },
      }),
      this.prisma.lead.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    const wonDealsCount = await this.prisma.deal.count({ where: { tenantId, status: 'won' } });
    const closedDealsCount = await this.prisma.deal.count({
      where: { tenantId, status: { in: ['won', 'lost'] } }
    });
    const conversionRate = closedDealsCount > 0 ? (wonDealsCount / closedDealsCount) * 100 : 0;

    return {
      totalContacts,
      totalDeals,
      totalLeads,
      totalCompanies,
      openDealsValue: Number(openDeals._sum.value) || 0,
      wonDealsValue: Number(wonDeals._sum.value) || 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      newLeadsThisMonth,
    };
  }

  async getDealsByStage(tenantId: string): Promise<DealsByStage[]> {
    const deals = await this.prisma.deal.groupBy({
      by: ['stageId'],
      where: { tenantId, status: 'open' },
      _count: { id: true },
      _sum: { value: true },
    });

    const stageIds = deals.map(d => d.stageId);
    const stages = await this.prisma.pipelineStage.findMany({
      where: { id: { in: stageIds } },
      select: { id: true, name: true, color: true },
    });

    const stageMap = new Map(stages.map(s => [s.id, s]));

    return deals.map(d => ({
      stageName: stageMap.get(d.stageId)?.name || 'غير محدد',
      stageColor: stageMap.get(d.stageId)?.color || '#6B7280',
      count: d._count.id,
      value: Number(d._sum.value) || 0,
    }));
  }

  async getLeadsBySource(tenantId: string): Promise<LeadsBySource[]> {
    const leads = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { tenantId },
      _count: { id: true },
    });

    const total = leads.reduce((sum, l) => sum + l._count.id, 0);

    const sourceLabels: Record<string, string> = {
      'manual': 'يدوي',
      'website': 'الموقع الإلكتروني',
      'whatsapp': 'واتساب',
      'instagram': 'إنستغرام',
      'facebook': 'فيسبوك',
      'referral': 'إحالة',
      'aqar': 'عقار',
      'haraj': 'حراج',
    };

    return leads.map(l => ({
      source: sourceLabels[l.source] || l.source,
      count: l._count.id,
      percentage: total > 0 ? Math.round((l._count.id / total) * 1000) / 10 : 0,
    }));
  }

  async getRecentActivities(tenantId: string, limit = 10): Promise<RecentActivity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
    });

    return activities.map(a => ({
      id: a.id,
      type: a.type,
      subject: a.subject || '',
      createdAt: a.createdAt,
      contactName: a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : undefined,
      dealTitle: a.deal?.title,
    }));
  }

  async getSalesPerformance(tenantId: string): Promise<SalesPerformance[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            ownedDeals: { where: { status: 'won' } },
            activities: { where: { isCompleted: true } },
          },
        },
        ownedDeals: {
          where: { status: 'won' },
          select: { value: true },
        },
      },
    });

    return users.map(u => ({
      userId: u.id,
      userName: `${u.firstName} ${u.lastName}`,
      dealsWon: u._count.ownedDeals,
      totalValue: u.ownedDeals.reduce((sum, d) => sum + Number(d.value), 0),
      activitiesCompleted: u._count.activities,
    })).sort((a, b) => b.totalValue - a.totalValue);
  }

  async getMonthlyRevenue(tenantId: string, months = 6): Promise<{ month: string; revenue: number }[]> {
    const results: { month: string; revenue: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthDeals = await this.prisma.deal.aggregate({
        where: {
          tenantId,
          status: 'won',
          closedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { value: true },
      });

      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      results.push({
        month: monthNames[startDate.getMonth()],
        revenue: Number(monthDeals._sum.value) || 0,
      });
    }

    return results;
  }

  async getUpcomingActivities(tenantId: string, userId: string, limit = 5): Promise<RecentActivity[]> {
    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId,
        createdById: userId,
        isCompleted: false,
        dueDate: {
          gte: new Date(),
        },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
    });

    return activities.map(a => ({
      id: a.id,
      type: a.type,
      subject: a.subject || '',
      createdAt: a.dueDate || a.createdAt,
      contactName: a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : undefined,
      dealTitle: a.deal?.title,
    }));
  }
}
