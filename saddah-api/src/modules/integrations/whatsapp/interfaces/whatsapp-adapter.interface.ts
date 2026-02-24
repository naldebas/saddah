// src/modules/integrations/whatsapp/interfaces/whatsapp-adapter.interface.ts

export interface MessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  timestamp?: Date;
  error?: string;
  errorCode?: string;
}

export interface MediaMessageOptions {
  caption?: string;
  filename?: string;
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters: TemplateParameter[];
}

export interface SendTemplateOptions {
  language?: string;
  components?: TemplateComponent[];
}

export interface WebhookVerificationResult {
  valid: boolean;
  challenge?: string;
}

export interface IncomingMessage {
  from: string;
  messageId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'sticker' | 'reaction';
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaCaption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    name: string;
    phones: string[];
  };
  reaction?: {
    messageId: string;
    emoji: string;
  };
  context?: {
    messageId: string;
    from: string;
  };
}

export interface StatusUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  recipientId: string;
  error?: {
    code: string;
    title: string;
    message?: string;
  };
}

export interface WhatsAppAdapter {
  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Send a text message
   */
  sendTextMessage(to: string, message: string): Promise<MessageResult>;

  /**
   * Send a template message (required for business-initiated conversations)
   */
  sendTemplateMessage(
    to: string,
    templateName: string,
    options?: SendTemplateOptions,
  ): Promise<MessageResult>;

  /**
   * Send a media message (image, audio, video, document)
   */
  sendMediaMessage(
    to: string,
    mediaUrl: string,
    type: 'image' | 'audio' | 'video' | 'document',
    options?: MediaMessageOptions,
  ): Promise<MessageResult>;

  /**
   * Send a location message
   */
  sendLocationMessage(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<MessageResult>;

  /**
   * Mark a message as read
   */
  markAsRead(messageId: string): Promise<boolean>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    signature: string,
    payload: string | Buffer,
  ): boolean;

  /**
   * Handle webhook verification challenge (for Meta)
   */
  handleVerificationChallenge(
    mode: string,
    token: string,
    challenge: string,
  ): WebhookVerificationResult;

  /**
   * Parse incoming webhook payload to standardized format
   */
  parseIncomingMessage(payload: any): IncomingMessage | null;

  /**
   * Parse status update webhook payload
   */
  parseStatusUpdate(payload: any): StatusUpdate | null;

  /**
   * Download media from WhatsApp (returns buffer or URL)
   */
  downloadMedia(mediaId: string): Promise<{ url: string; mimeType: string } | null>;

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean;
}

export const WHATSAPP_ADAPTER = 'WHATSAPP_ADAPTER';
