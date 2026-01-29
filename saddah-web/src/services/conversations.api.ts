// src/services/conversations.api.ts
import { api } from './api';

export type ConversationChannel = 'whatsapp' | 'voice' | 'web_chat' | 'email' | 'sms';
export type ConversationStatus = 'bot' | 'pending' | 'active' | 'resolved' | 'closed';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'template';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageSender = 'user' | 'bot' | 'contact';

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  sender: MessageSender;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  transcription?: string;
  duration?: number;
  externalId?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  contactId?: string;
  assignedToId?: string;
  channel: ConversationChannel;
  channelId: string;
  status: ConversationStatus;
  qualificationData: Record<string, unknown>;
  lastMessageAt?: string;
  closedAt?: string;
  closedReason?: string;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    whatsapp?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  messages?: {
    id: string;
    content: string;
    type: MessageType;
    sender: MessageSender;
    createdAt: string;
  }[];
  _count?: {
    messages: number;
  };
}

export interface ConversationStatistics {
  total: number;
  active: number;
  pending: number;
  closed: number;
  unassigned: number;
  byChannel: Record<string, number>;
}

export interface CreateConversationDto {
  channel: ConversationChannel;
  channelId: string;
  contactId?: string;
  assignedToId?: string;
  status?: ConversationStatus;
  qualificationData?: Record<string, unknown>;
}

export interface UpdateConversationDto {
  contactId?: string;
  assignedToId?: string;
  status?: ConversationStatus;
  qualificationData?: Record<string, unknown>;
}

export interface SendMessageDto {
  direction: MessageDirection;
  sender: MessageSender;
  type?: MessageType;
  content: string;
  mediaUrl?: string;
  duration?: number;
  externalId?: string;
}

export interface QueryConversationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ConversationStatus;
  channel?: ConversationChannel;
  assignedToId?: string;
  contactId?: string;
  unassignedOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryMessagesParams {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const conversationsApi = {
  // Conversations
  getAll: async (params?: QueryConversationsParams): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  getMy: async (params?: QueryConversationsParams): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get('/conversations/my', { params });
    return response.data;
  },

  getUnassigned: async (params?: QueryConversationsParams): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get('/conversations/unassigned', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Conversation> => {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },

  create: async (dto: CreateConversationDto): Promise<Conversation> => {
    const response = await api.post('/conversations', dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateConversationDto): Promise<Conversation> => {
    const response = await api.patch(`/conversations/${id}`, dto);
    return response.data;
  },

  assign: async (id: string, assignedToId: string): Promise<Conversation> => {
    const response = await api.post(`/conversations/${id}/assign`, { assignedToId });
    return response.data;
  },

  take: async (id: string): Promise<Conversation> => {
    const response = await api.post(`/conversations/${id}/take`);
    return response.data;
  },

  close: async (id: string, reason?: string): Promise<Conversation> => {
    const response = await api.post(`/conversations/${id}/close`, { reason });
    return response.data;
  },

  reopen: async (id: string): Promise<Conversation> => {
    const response = await api.post(`/conversations/${id}/reopen`);
    return response.data;
  },

  linkToContact: async (id: string, contactId: string): Promise<Conversation> => {
    const response = await api.post(`/conversations/${id}/link-contact`, { contactId });
    return response.data;
  },

  getStatistics: async (): Promise<ConversationStatistics> => {
    const response = await api.get('/conversations/statistics');
    return response.data;
  },

  // Messages
  getMessages: async (conversationId: string, params?: QueryMessagesParams): Promise<PaginatedResponse<Message>> => {
    const response = await api.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  sendMessage: async (conversationId: string, dto: SendMessageDto): Promise<Message> => {
    const response = await api.post(`/conversations/${conversationId}/messages`, dto);
    return response.data;
  },
};
