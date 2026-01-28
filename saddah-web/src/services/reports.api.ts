import { api } from './api';

// Query params
export interface ReportQueryParams {
  period?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';
  startDate?: string;
  endDate?: string;
  userId?: string;
  pipelineId?: string;
}

// Sales Report
export interface SalesReportSummary {
  totalDeals: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
  lostValue: number;
  openDeals: number;
  openValue: number;
  conversionRate: number;
  avgDealValue: number;
}

export interface SalesReportByStage {
  stageId: string;
  stageName: string;
  stageColor: string;
  count: number;
  value: number;
}

export interface SalesReportByUser {
  userId: string;
  userName: string;
  dealsWon: number;
  totalValue: number;
}

export interface SalesReport {
  period: { startDate: string; endDate: string };
  summary: SalesReportSummary;
  byStage: SalesReportByStage[];
  byUser: SalesReportByUser[];
}

// Leads Report
export interface LeadsReportSummary {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgScore: number;
}

export interface LeadsReportByStatus {
  status: string;
  statusLabel: string;
  count: number;
  percentage: number;
}

export interface LeadsReportBySource {
  source: string;
  sourceLabel: string;
  count: number;
  percentage: number;
}

export interface LeadsReportByGrade {
  grade: string;
  gradeLabel: string;
  count: number;
  percentage: number;
}

export interface LeadsReport {
  period: { startDate: string; endDate: string };
  summary: LeadsReportSummary;
  byStatus: LeadsReportByStatus[];
  bySource: LeadsReportBySource[];
  byGrade: LeadsReportByGrade[];
}

// Activities Report
export interface ActivitiesReportSummary {
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  completionRate: number;
}

export interface ActivitiesReportByType {
  type: string;
  typeLabel: string;
  count: number;
  percentage: number;
}

export interface ActivitiesReportByUser {
  userId: string;
  userName: string;
  totalActivities: number;
  completedActivities: number;
  completionRate: number;
}

export interface ActivitiesReport {
  period: { startDate: string; endDate: string };
  summary: ActivitiesReportSummary;
  byType: ActivitiesReportByType[];
  byUser: ActivitiesReportByUser[];
}

// Contacts Report
export interface ContactsReportSummary {
  totalContacts: number;
  contactsWithDeals: number;
  engagementRate: number;
}

export interface ContactsReportBySource {
  source: string;
  sourceLabel: string;
  count: number;
  percentage: number;
}

export interface ContactsReportByOwner {
  userId: string;
  userName: string;
  count: number;
}

export interface ContactsReport {
  period: { startDate: string; endDate: string };
  summary: ContactsReportSummary;
  bySource: ContactsReportBySource[];
  byOwner: ContactsReportByOwner[];
}

export const reportsApi = {
  // Get sales report
  getSalesReport: async (params?: ReportQueryParams): Promise<SalesReport> => {
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },

  // Get leads report
  getLeadsReport: async (params?: ReportQueryParams): Promise<LeadsReport> => {
    const response = await api.get('/reports/leads', { params });
    return response.data;
  },

  // Get activities report
  getActivitiesReport: async (params?: ReportQueryParams): Promise<ActivitiesReport> => {
    const response = await api.get('/reports/activities', { params });
    return response.data;
  },

  // Get contacts report
  getContactsReport: async (params?: ReportQueryParams): Promise<ContactsReport> => {
    const response = await api.get('/reports/contacts', { params });
    return response.data;
  },

  // Export deals to CSV
  exportDeals: async (params?: ReportQueryParams): Promise<Blob> => {
    const response = await api.get('/reports/export/deals', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Export leads to CSV
  exportLeads: async (params?: ReportQueryParams): Promise<Blob> => {
    const response = await api.get('/reports/export/leads', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Export activities to CSV
  exportActivities: async (params?: ReportQueryParams): Promise<Blob> => {
    const response = await api.get('/reports/export/activities', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// Helper to download blob as file
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
