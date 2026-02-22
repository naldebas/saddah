import { api } from './api';

export interface Company {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  size: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    contacts: number;
    deals: number;
  };
}

export interface CompaniesResponse {
  data: Company[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  city?: string;
  size?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCompanyDto {
  name: string;
  ownerId?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  size?: string;
  tags?: string[];
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}

export const companiesApi = {
  getAll: async (params: CompaniesParams = {}): Promise<CompaniesResponse> => {
    const response = await api.get<CompaniesResponse>('/companies', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Company> => {
    const response = await api.get<Company>(`/companies/${id}`);
    return response.data;
  },

  getIndustries: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/companies/industries');
    return response.data;
  },

  getCities: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/companies/cities');
    return response.data;
  },

  create: async (data: CreateCompanyDto): Promise<Company> => {
    const response = await api.post<Company>('/companies', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCompanyDto): Promise<Company> => {
    const response = await api.patch<Company>(`/companies/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },
};
