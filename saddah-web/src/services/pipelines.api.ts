import { api } from './api';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  probability: number;
  pipelineId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    deals: number;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  stages: PipelineStage[];
  _count?: {
    deals: number;
  };
}

export interface CreatePipelineDto {
  name: string;
  description?: string;
  isDefault?: boolean;
  stages?: {
    name: string;
    color: string;
    probability: number;
  }[];
}

export interface UpdatePipelineDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CreateStageDto {
  name: string;
  color: string;
  probability: number;
  order?: number;
}

export interface UpdateStageDto {
  name?: string;
  color?: string;
  probability?: number;
  order?: number;
}

export const pipelinesApi = {
  getAll: async (): Promise<Pipeline[]> => {
    const response = await api.get('/pipelines');
    return response.data;
  },

  getById: async (id: string): Promise<Pipeline> => {
    const response = await api.get(`/pipelines/${id}`);
    return response.data;
  },

  create: async (data: CreatePipelineDto): Promise<Pipeline> => {
    const response = await api.post('/pipelines', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePipelineDto): Promise<Pipeline> => {
    const response = await api.patch(`/pipelines/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/pipelines/${id}`);
  },

  // Stage operations
  createStage: async (pipelineId: string, data: CreateStageDto): Promise<PipelineStage> => {
    const response = await api.post(`/pipelines/${pipelineId}/stages`, data);
    return response.data;
  },

  updateStage: async (pipelineId: string, stageId: string, data: UpdateStageDto): Promise<PipelineStage> => {
    const response = await api.patch(`/pipelines/${pipelineId}/stages/${stageId}`, data);
    return response.data;
  },

  deleteStage: async (pipelineId: string, stageId: string): Promise<void> => {
    await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
  },

  reorderStages: async (pipelineId: string, stageIds: string[]): Promise<void> => {
    const stageOrders = stageIds.map((id, index) => ({ id, order: index }));
    await api.patch(`/pipelines/${pipelineId}/stages/reorder`, stageOrders);
  },
};
