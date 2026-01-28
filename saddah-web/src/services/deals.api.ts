import { api } from './api';

export interface Deal {
  id: string;
  tenantId: string;
  ownerId: string;
  contactId: string | null;
  companyId: string | null;
  pipelineId: string;
  stageId: string;
  title: string;
  value: string;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  closedAt: string | null;
  status: 'open' | 'won' | 'lost';
  lostReason: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  stage?: {
    id: string;
    name: string;
    color: string;
    probability: number;
  };
  pipeline?: {
    id: string;
    name: string;
  };
}

export interface DealsResponse {
  data: Deal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DealsParams {
  page?: number;
  limit?: number;
  contactId?: string;
  companyId?: string;
  pipelineId?: string;
  stageId?: string;
  status?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateDealDto {
  contactId?: string;
  companyId?: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency?: string;
  expectedCloseDate?: string;
  tags?: string[];
}

export interface UpdateDealDto extends Partial<Omit<CreateDealDto, 'pipelineId'>> {}

export interface MoveDealDto {
  stageId: string;
}

export interface CloseDealDto {
  status: 'won' | 'lost';
  lostReason?: string;
}

export interface KanbanResponse {
  pipeline: {
    id: string;
    name: string;
  };
  stages: Array<{
    id: string;
    name: string;
    color: string;
    probability: number;
    order: number;
    deals: Deal[];
    totalValue: number;
    count: number;
  }>;
}

export const dealsApi = {
  getAll: async (params: DealsParams = {}): Promise<DealsResponse> => {
    const response = await api.get<DealsResponse>('/deals', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Deal> => {
    const response = await api.get<Deal>(`/deals/${id}`);
    return response.data;
  },

  getKanban: async (pipelineId: string): Promise<KanbanResponse> => {
    const response = await api.get<KanbanResponse>(`/deals/kanban/${pipelineId}`);
    return response.data;
  },

  create: async (data: CreateDealDto): Promise<Deal> => {
    const response = await api.post<Deal>('/deals', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDealDto): Promise<Deal> => {
    const response = await api.patch<Deal>(`/deals/${id}`, data);
    return response.data;
  },

  move: async (id: string, data: MoveDealDto): Promise<Deal> => {
    const response = await api.patch<Deal>(`/deals/${id}/move`, data);
    return response.data;
  },

  close: async (id: string, data: CloseDealDto): Promise<Deal> => {
    const response = await api.patch<Deal>(`/deals/${id}/close`, data);
    return response.data;
  },

  reopen: async (id: string): Promise<Deal> => {
    const response = await api.patch<Deal>(`/deals/${id}/reopen`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/deals/${id}`);
  },
};

// Pipelines API
export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stages?: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  probability: number;
  color: string;
}

export interface PipelinesResponse {
  data: Pipeline[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const pipelinesApi = {
  getAll: async (): Promise<Pipeline[]> => {
    const response = await api.get<Pipeline[]>('/pipelines');
    return response.data;
  },

  getById: async (id: string): Promise<Pipeline> => {
    const response = await api.get<Pipeline>(`/pipelines/${id}`);
    return response.data;
  },

  getDefault: async (): Promise<Pipeline> => {
    const response = await api.get<Pipeline>('/pipelines/default');
    return response.data;
  },
};
