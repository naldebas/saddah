import { api } from './api';

export interface Contact {
  id: string;
  tenantId: string;
  ownerId: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  title: string | null;
  source: string;
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
  company?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    deals: number;
    activities: number;
  };
}

export interface ContactsResponse {
  data: Contact[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  title?: string;
  companyId?: string;
  source?: string;
  tags?: string[];
}

export interface UpdateContactDto extends Partial<CreateContactDto> {}

export const contactsApi = {
  getAll: async (params: ContactsParams = {}): Promise<ContactsResponse> => {
    const response = await api.get<ContactsResponse>('/contacts', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Contact> => {
    const response = await api.get<Contact>(`/contacts/${id}`);
    return response.data;
  },

  create: async (data: CreateContactDto): Promise<Contact> => {
    const response = await api.post<Contact>('/contacts', data);
    return response.data;
  },

  update: async (id: string, data: UpdateContactDto): Promise<Contact> => {
    const response = await api.patch<Contact>(`/contacts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/contacts/${id}`);
  },
};
