// src/modules/integrations/botpress/interfaces/botpress-api.interface.ts

/**
 * Botpress Cloud API interfaces
 */

export interface BotpressCredentials {
  token: string;
  webhookSecret: string;
}

export interface BotpressMessage {
  type: 'text' | 'image' | 'audio' | 'file' | 'carousel' | 'choice';
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  choices?: BotpressChoice[];
  cards?: BotpressCard[];
}

export interface BotpressChoice {
  title: string;
  value: string;
}

export interface BotpressCard {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  actions?: BotpressCardAction[];
}

export interface BotpressCardAction {
  action: 'url' | 'postback' | 'say';
  title: string;
  payload?: string;
  url?: string;
}

export interface BotpressConversationPayload {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
  tags?: Record<string, string>;
}

export interface BotpressUserPayload {
  id: string;
  tags?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface BotpressSendMessagePayload {
  userId: string;
  conversationId: string;
  payload: BotpressMessage;
  tags?: Record<string, string>;
}

export interface BotpressSendMessageResponse {
  message: {
    id: string;
    conversationId: string;
    userId: string;
    type: string;
    payload: any;
    createdAt: string;
    direction: 'incoming' | 'outgoing';
  };
}

export interface BotpressCreateUserPayload {
  tags?: Record<string, string>;
  name?: string;
  pictureUrl?: string;
}

export interface BotpressCreateUserResponse {
  user: BotpressUserPayload;
}

export interface BotpressCreateConversationPayload {
  channel: string;
  tags?: Record<string, string>;
}

export interface BotpressCreateConversationResponse {
  conversation: BotpressConversationPayload;
}

export interface BotpressConversationState {
  conversationId: string;
  state: Record<string, any>;
  updatedAt: string;
}

export interface BotpressTestConnectionResult {
  success: boolean;
  botId?: string;
  botName?: string;
  workspaceId?: string;
  workspaceName?: string;
  error?: string;
}

export interface BotpressApiError {
  type: string;
  message: string;
  code?: string;
  details?: any;
}
