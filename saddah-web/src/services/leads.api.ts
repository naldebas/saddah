import { api } from './api';
import type { Contact } from './contacts.api';
import type { Deal } from './deals.api';

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source: string;
  sourceId?: string;
  propertyType?: string;
  budget?: number;
  timeline?: string;
  location?: string;
  financingNeeded?: boolean;
  status: string;
  score?: number;
  scoreGrade?: string;
  notes?: string;
  tags: string[];
  convertedAt?: string;
  convertedToContactId?: string;
  convertedToDealId?: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface LeadsResponse {
  data: Lead[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LeadStatistics {
  total: number;
  byStatus: {
    new: number;
    qualified: number;
    converted: number;
  };
  bySource: Array<{ source: string; count: number }>;
  byPropertyType: Array<{ propertyType: string; count: number }>;
  averageScore: number;
  conversionRate: number;
}

export interface CreateLeadDto {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source?: string;
  propertyType?: string;
  budget?: number;
  timeline?: string;
  location?: string;
  financingNeeded?: boolean;
  ownerId?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: string;
}

export interface ConvertLeadDto {
  companyId?: string;
  pipelineId?: string;
  dealTitle?: string;
}

export interface ScoreLeadDto {
  score: number;
  grade: string;
  factors?: Record<string, number>;
}

export interface QueryLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  propertyType?: string;
  ownerId?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const leadsApi = {
  getAll: async (params?: QueryLeadsParams): Promise<LeadsResponse> => {
    const response = await api.get('/leads', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<Lead> => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  create: async (data: CreateLeadDto): Promise<Lead> => {
    const response = await api.post('/leads', data);
    return response.data;
  },

  update: async (id: string, data: UpdateLeadDto): Promise<Lead> => {
    const response = await api.patch(`/leads/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<Lead> => {
    const response = await api.patch(`/leads/${id}/status/${status}`);
    return response.data;
  },

  score: async (id: string, data: ScoreLeadDto): Promise<Lead> => {
    const response = await api.post(`/leads/${id}/score`, data);
    return response.data;
  },

  convert: async (id: string, data: ConvertLeadDto): Promise<{ lead: Lead; contact: Contact; deal: Deal }> => {
    const response = await api.post(`/leads/${id}/convert`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`);
  },

  getStatistics: async (): Promise<LeadStatistics> => {
    const response = await api.get('/leads/statistics');
    return response.data;
  },
};

