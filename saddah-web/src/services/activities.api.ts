import { api } from './api';

export interface Activity {
  id: string;
  tenantId: string;
  createdById: string;
  contactId: string | null;
  dealId: string | null;
  type: 'call' | 'meeting' | 'email' | 'task' | 'note' | 'whatsapp' | 'site_visit';
  subject: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  outcome: string | null;
  duration: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  deal?: {
    id: string;
    title: string;
  } | null;
}

export interface ActivitiesResponse {
  data: Activity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ActivitiesParams {
  page?: number;
  limit?: number;
  contactId?: string;
  dealId?: string;
  type?: string;
  isCompleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateActivityDto {
  contactId?: string;
  dealId?: string;
  type: Activity['type'];
  subject: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {}

export interface CompleteActivityDto {
  outcome?: string;
  duration?: number;
}

export const activitiesApi = {
  getAll: async (params: ActivitiesParams = {}): Promise<ActivitiesResponse> => {
    const response = await api.get<ActivitiesResponse>('/activities', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Activity> => {
    const response = await api.get<Activity>(`/activities/${id}`);
    return response.data;
  },

  getTimeline: async (params: ActivitiesParams = {}): Promise<ActivitiesResponse> => {
    const response = await api.get<ActivitiesResponse>('/activities/timeline', { params });
    return response.data;
  },

  create: async (data: CreateActivityDto): Promise<Activity> => {
    const response = await api.post<Activity>('/activities', data);
    return response.data;
  },

  update: async (id: string, data: UpdateActivityDto): Promise<Activity> => {
    const response = await api.patch<Activity>(`/activities/${id}`, data);
    return response.data;
  },

  complete: async (id: string, data: CompleteActivityDto = {}): Promise<Activity> => {
    const response = await api.patch<Activity>(`/activities/${id}/complete`, data);
    return response.data;
  },

  uncomplete: async (id: string): Promise<Activity> => {
    const response = await api.patch<Activity>(`/activities/${id}/uncomplete`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/activities/${id}`);
  },
};
