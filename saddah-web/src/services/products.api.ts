import { api } from './api';

export enum ProductType {
  VILLA = 'villa',
  APARTMENT = 'apartment',
  TOWNHOUSE = 'townhouse',
  FLOOR = 'floor',
  LAND = 'land',
  OFFICE = 'office',
  SHOP = 'shop',
}

export enum ProductStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
}

export interface ProductProject {
  id: string;
  name: string;
  city: string;
  district?: string;
  type: string;
}

export interface Product {
  id: string;
  tenantId: string;
  projectId: string;
  unitNumber: string;
  type: ProductType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  price: number;
  currency: string;
  status: ProductStatus;
  features: string[];
  images: unknown[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  project?: ProductProject;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductStatistics {
  total: number;
  byStatus: {
    available: number;
    reserved: number;
    sold: number;
  };
  byType: Array<{ type: string; count: number }>;
  averagePrice: number;
}

export interface CreateProductDto {
  projectId: string;
  unitNumber: string;
  type: ProductType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  price: number;
  currency?: string;
  status?: ProductStatus;
  features?: string[];
  images?: string[];
  isActive?: boolean;
}

export interface UpdateProductDto extends Partial<Omit<CreateProductDto, 'projectId'>> {}

export interface QueryProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  type?: ProductType;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  city?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchProductsParams {
  propertyType?: string;
  budgetMax?: number;
  city?: string;
  district?: string;
  minBedrooms?: number;
  minArea?: number;
  limit?: number;
}

export interface ProductWithScore extends Product {
  matchScore: number;
  matchReasons: Record<string, number>;
}

export interface LeadProductSuggestion {
  id: string;
  leadId: string;
  productId: string;
  matchScore: number;
  matchReason: Record<string, number>;
  status: 'suggested' | 'viewed' | 'interested' | 'rejected';
  suggestedAt: string;
  product: Product;
}

export const productsApi = {
  getAll: async (params?: QueryProductsParams): Promise<ProductsResponse> => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await api.patch(`/products/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: ProductStatus): Promise<Product> => {
    const response = await api.patch(`/products/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  getStatistics: async (): Promise<ProductStatistics> => {
    const response = await api.get('/products/statistics');
    return response.data;
  },

  search: async (params: SearchProductsParams): Promise<{ data: ProductWithScore[]; total: number }> => {
    const response = await api.get('/products/search', { params });
    return response.data;
  },

  getSuggestionsForLead: async (leadId: string): Promise<LeadProductSuggestion[]> => {
    const response = await api.get(`/products/suggestions/${leadId}`);
    return response.data;
  },

  updateSuggestionStatus: async (
    leadId: string,
    productId: string,
    status: 'viewed' | 'interested' | 'rejected',
  ): Promise<LeadProductSuggestion> => {
    const response = await api.patch(`/products/suggestions/${leadId}/${productId}/status`, { status });
    return response.data;
  },
};
