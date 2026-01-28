// src/services/search.api.ts
import { api } from './api';

export interface SearchResult {
  type: 'contact' | 'company' | 'deal' | 'lead';
  id: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResponse {
  contacts: SearchResult[];
  companies: SearchResult[];
  deals: SearchResult[];
  leads: SearchResult[];
  total: number;
}

export interface PaginatedSearchResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const searchApi = {
  globalSearch: async (query: string, limit = 5): Promise<GlobalSearchResponse> => {
    const response = await api.get('/search', {
      params: { q: query, limit },
    });
    return response.data;
  },

  searchContacts: async (query: string, page = 1, limit = 20): Promise<PaginatedSearchResponse<unknown>> => {
    const response = await api.get('/search/contacts', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  searchCompanies: async (query: string, page = 1, limit = 20): Promise<PaginatedSearchResponse<unknown>> => {
    const response = await api.get('/search/companies', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  searchDeals: async (query: string, page = 1, limit = 20): Promise<PaginatedSearchResponse<unknown>> => {
    const response = await api.get('/search/deals', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  searchLeads: async (query: string, page = 1, limit = 20): Promise<PaginatedSearchResponse<unknown>> => {
    const response = await api.get('/search/leads', {
      params: { q: query, page, limit },
    });
    return response.data;
  },
};
