import { api } from './api';

// ============ Botpress Config Types ============

export interface BotpressCredentials {
  token: string;
  webhookSecret?: string;
}

export interface BotpressConfig {
  id: string;
  tenantId: string;
  botId: string;
  workspaceId: string;
  webhookUrl: string;
  callbackUrl: string;
  isActive: boolean;
  isVerified: boolean;
  autoCreateLead: boolean;
  autoConvertDeal: boolean;
  qualificationThreshold: number;
  defaultPipelineId?: string;
  lastTestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  maskedCredentials: Record<string, string>;
}

export interface BotpressConfigResponse {
  configured: boolean;
  config?: BotpressConfig;
}

export interface CreateBotpressConfigDto {
  botId: string;
  workspaceId: string;
  credentials: BotpressCredentials;
  webhookUrl?: string;
  autoCreateLead?: boolean;
  autoConvertDeal?: boolean;
  qualificationThreshold?: number;
  defaultPipelineId?: string;
}

export interface UpdateBotpressConfigDto {
  botId?: string;
  workspaceId?: string;
  credentials?: BotpressCredentials;
  webhookUrl?: string;
  autoCreateLead?: boolean;
  autoConvertDeal?: boolean;
  qualificationThreshold?: number;
  defaultPipelineId?: string;
}

export interface BotpressTestResult {
  success: boolean;
  botId?: string;
  botName?: string;
  workspaceId?: string;
  workspaceName?: string;
  error?: string;
  testedAt: string;
}

// ============ Botpress Conversation Types ============

export interface BotpressConversation {
  id: string;
  tenantId: string;
  conversationId: string;
  botpressConvId: string;
  botpressState?: string;
  qualificationData: Record<string, unknown>;
  qualificationScore: number;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotpressConversationsResponse {
  data: BotpressConversation[];
  total: number;
}

export interface ListConversationsParams {
  skip?: number;
  take?: number;
  state?: string;
}

// ============ Botpress API ============

export const botpressApi = {
  // Configuration
  getConfig: async (): Promise<BotpressConfigResponse> => {
    try {
      const response = await api.get('/settings/botpress');
      if (!response.data || response.data.configured === false) {
        return { configured: false };
      }
      return { configured: true, config: response.data };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { configured: false };
      }
      throw error;
    }
  },

  updateConfig: async (data: CreateBotpressConfigDto | UpdateBotpressConfigDto): Promise<BotpressConfig> => {
    const response = await api.put('/settings/botpress', data);
    return response.data;
  },

  deleteConfig: async (): Promise<void> => {
    await api.delete('/settings/botpress');
  },

  testConnection: async (): Promise<BotpressTestResult> => {
    const response = await api.post('/settings/botpress/test');
    return response.data;
  },

  activate: async (): Promise<BotpressConfig> => {
    const response = await api.post('/settings/botpress/activate');
    return response.data;
  },

  deactivate: async (): Promise<BotpressConfig> => {
    const response = await api.post('/settings/botpress/deactivate');
    return response.data;
  },

  // Conversations
  getConversations: async (params?: ListConversationsParams): Promise<BotpressConversationsResponse> => {
    const response = await api.get('/botpress/conversations', { params });
    return response.data;
  },

  getConversation: async (id: string): Promise<BotpressConversation | null> => {
    const response = await api.get(`/botpress/conversations/${id}`);
    return response.data;
  },

  handoff: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/botpress/conversations/${id}/handoff`);
    return response.data;
  },

  resume: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/botpress/conversations/${id}/resume`);
    return response.data;
  },

  sync: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/botpress/conversations/${id}/sync`);
    return response.data;
  },
};
