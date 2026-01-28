import { api } from './api';

export interface DashboardStats {
  contacts: {
    total: number;
    change: number;
  };
  deals: {
    total: number;
    open: number;
    won: number;
    totalValue: number;
    change: number;
  };
  leads: {
    total: number;
    new: number;
    qualified: number;
    conversionRate: number;
    change: number;
  };
  activities: {
    total: number;
    upcoming: number;
    overdue: number;
    completedToday: number;
  };
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  count: number;
  value: number;
  color: string;
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

export interface SalesPerformance {
  userId: string;
  userName: string;
  dealsWon: number;
  totalValue: number;
  activitiesCompleted: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface DashboardWidgets {
  stats: {
    totalContacts: number;
    totalDeals: number;
    totalLeads: number;
    totalCompanies: number;
    openDealsValue: number;
    wonDealsValue: number;
    conversionRate: number;
    newLeadsThisMonth: number;
  };
  dealsByStage: DealsByStage[];
  leadsBySource: LeadsBySource[];
  recentActivities: RecentActivity[];
  salesPerformance: SalesPerformance[];
  monthlyRevenue: MonthlyRevenue[];
  upcomingActivities: RecentActivity[];
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // Aggregate data from multiple endpoints
    const [contactsRes, dealsRes, leadsRes, activitiesRes] = await Promise.all([
      api.get('/contacts', { params: { limit: 1 } }),
      api.get('/deals/statistics'),
      api.get('/leads/statistics'),
      api.get('/activities/statistics'),
    ]);

    // Change percentages are calculated by comparing with previous period data
    // These values come from the statistics endpoints when available
    const contactsChange = contactsRes.data.meta?.change ?? 0;
    const dealsChange = dealsRes.data.change ?? 0;
    const leadsChange = leadsRes.data.change ?? 0;

    return {
      contacts: {
        total: contactsRes.data.meta?.total || 0,
        change: contactsChange,
      },
      deals: {
        total: dealsRes.data.total || 0,
        open: dealsRes.data.byStage?.reduce((sum: number, s: { count: number }) => sum + s.count, 0) || 0,
        won: dealsRes.data.byStatus?.won || 0,
        totalValue: dealsRes.data.totalValue || 0,
        change: dealsChange,
      },
      leads: {
        total: leadsRes.data.total || 0,
        new: leadsRes.data.byStatus?.new || 0,
        qualified: leadsRes.data.byStatus?.qualified || 0,
        conversionRate: leadsRes.data.conversionRate || 0,
        change: leadsChange,
      },
      activities: {
        total: activitiesRes.data.total || 0,
        upcoming: activitiesRes.data.upcoming || 0,
        overdue: activitiesRes.data.overdue || 0,
        completedToday: activitiesRes.data.completedToday || 0,
      },
    };
  },

  getRecentActivities: async (limit = 5): Promise<RecentActivity[]> => {
    const response = await api.get('/activities', {
      params: { limit, sortBy: 'createdAt', sortOrder: 'desc' },
    });
    return response.data.data || [];
  },

  getPipelineStats: async (): Promise<PipelineStage[]> => {
    const response = await api.get('/deals/statistics');
    const stageColors: Record<string, string> = {
      'عميل محتمل': 'bg-gray-400',
      'تواصل أولي': 'bg-blue-400',
      'عرض سعر': 'bg-purple-400',
      'تفاوض': 'bg-yellow-400',
      'مراجعة العقد': 'bg-orange-400',
      'إغلاق': 'bg-green-400',
    };

    return (response.data.byStage || []).map((stage: { stageId: string; stageName: string; count: number; totalValue: number }) => ({
      id: stage.stageId,
      name: stage.stageName,
      count: stage.count,
      value: stage.totalValue,
      color: stageColors[stage.stageName] || 'bg-gray-400',
    }));
  },

  // New dashboard widget endpoints
  getWidgetStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getDealsByStage: async (): Promise<DealsByStage[]> => {
    const response = await api.get('/dashboard/deals-by-stage');
    return response.data;
  },

  getLeadsBySource: async (): Promise<LeadsBySource[]> => {
    const response = await api.get('/dashboard/leads-by-source');
    return response.data;
  },

  getSalesPerformance: async (): Promise<SalesPerformance[]> => {
    const response = await api.get('/dashboard/sales-performance');
    return response.data;
  },

  getMonthlyRevenue: async (months = 6): Promise<MonthlyRevenue[]> => {
    const response = await api.get('/dashboard/monthly-revenue', {
      params: { months },
    });
    return response.data;
  },

  getUpcomingActivities: async (limit = 5): Promise<RecentActivity[]> => {
    const response = await api.get('/dashboard/upcoming-activities', {
      params: { limit },
    });
    return response.data;
  },

  getAllWidgets: async (): Promise<DashboardWidgets> => {
    const response = await api.get('/dashboard/widgets');
    return response.data;
  },
};
