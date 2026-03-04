// src/modules/integrations/botpress/interfaces/botpress-events.interface.ts

/**
 * Botpress webhook event interfaces
 */

export type BotpressEventType =
  | 'message'
  | 'conversation_started'
  | 'conversation_ended'
  | 'state_changed'
  | 'qualification_complete'
  | 'handoff_requested'
  | 'user_created';

export interface BotpressWebhookEvent {
  type: BotpressEventType;
  timestamp: string;
  botId: string;
  conversationId: string;
  userId?: string;
  payload: any;
}

export interface BotpressMessageEvent extends BotpressWebhookEvent {
  type: 'message';
  payload: {
    id: string;
    type: string;
    text?: string;
    direction: 'incoming' | 'outgoing';
    metadata?: Record<string, any>;
  };
}

export interface BotpressStateChangedEvent extends BotpressWebhookEvent {
  type: 'state_changed';
  payload: {
    previousState: string;
    currentState: string;
    stateData: Record<string, any>;
  };
}

export interface BotpressQualificationEvent extends BotpressWebhookEvent {
  type: 'qualification_complete';
  payload: QualificationData;
}

export interface QualificationData {
  name?: string;
  phone: string;
  email?: string;
  propertyType?: string;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  location?: {
    city?: string;
    district?: string;
    region?: string;
  };
  timeline?: string;
  financingNeeded?: boolean;
  seriousnessScore: number;
  notes?: string;
  collectedAt: string;
}

export interface BotpressHandoffEvent extends BotpressWebhookEvent {
  type: 'handoff_requested';
  payload: {
    reason: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    context?: Record<string, any>;
    qualificationData?: Partial<QualificationData>;
  };
}

export interface BotpressConversationEndedEvent extends BotpressWebhookEvent {
  type: 'conversation_ended';
  payload: {
    reason: string;
    finalState?: string;
    qualificationData?: Partial<QualificationData>;
  };
}

/**
 * Internal events emitted within Saddah
 */
export const BotpressInternalEvents = {
  MESSAGE_FORWARDED: 'botpress.message.forwarded',
  MESSAGE_RECEIVED: 'botpress.message.received',
  QUALIFICATION_COMPLETE: 'botpress.qualification.complete',
  HANDOFF_TRIGGERED: 'botpress.handoff.triggered',
  CONVERSATION_SYNCED: 'botpress.conversation.synced',
  LEAD_CREATED: 'botpress.lead.created',
  DEAL_CREATED: 'botpress.deal.created',
  ERROR: 'botpress.error',
} as const;
