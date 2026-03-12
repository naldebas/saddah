import { api } from './api';
import type { Product } from './products.api';

export enum ProjectType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  MIXED = 'mixed',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  COMING_SOON = 'coming_soon',
  SOLD_OUT = 'sold_out',
}

export interface ProductStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  city: string;
  district?: string;
  type: ProjectType;
  description?: string;
  totalUnits: number;
  status: ProjectStatus;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  products?: Product[];
  productStats?: ProductStats;
  _count?: {
    products: number;
  };
}

export interface ProjectsResponse {
  data: Project[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProjectStatistics {
  total: number;
  byStatus: {
    active: number;
    comingSoon: number;
    soldOut: number;
  };
  byCity: Array<{ city: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
}

export interface CreateProjectDto {
  name: string;
  city: string;
  district?: string;
  type: ProjectType;
  description?: string;
  totalUnits?: number;
  status?: ProjectStatus;
  images?: string[];
  isActive?: boolean;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {}

export interface QueryProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const projectsApi = {
  getAll: async (params?: QueryProjectsParams): Promise<ProjectsResponse> => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectDto): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  getStatistics: async (): Promise<ProjectStatistics> => {
    const response = await api.get('/projects/statistics');
    return response.data;
  },

  getCities: async (): Promise<string[]> => {
    const response = await api.get('/projects/cities');
    return response.data;
  },
};
