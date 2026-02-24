// src/modules/integrations/whatsapp/adapters/meta.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  WhatsAppAdapter,
  MessageResult,
  SendTemplateOptions,
  MediaMessageOptions,
  WebhookVerificationResult,
  IncomingMessage,
  StatusUpdate,
} from '../interfaces/whatsapp-adapter.interface';

const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

@Injectable()
export class MetaWhatsAppAdapter implements WhatsAppAdapter {
  private readonly logger = new Logger(MetaWhatsAppAdapter.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;
  private readonly appSecret: string;
  private readonly verifyToken: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('whatsapp.meta.token', '');
    this.phoneNumberId = this.configService.get<string>('whatsapp.meta.phoneNumberId', '');
    this.businessAccountId = this.configService.get<string>('whatsapp.meta.businessAccountId', '');
    this.appSecret = this.configService.get<string>('whatsapp.meta.appSecret', '');
    this.verifyToken = this.configService.get<string>('whatsapp.webhookVerifyToken', '');

    if (this.isConfigured()) {
      this.logger.log('Meta WhatsApp adapter initialized');
    } else {
      this.logger.warn('Meta WhatsApp adapter not configured - missing credentials');
    }
  }

  getProviderName(): string {
    return 'meta';
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    return phoneNumber.replace(/[^\d]/g, '');
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: any,
  ): Promise<any> {
    const url = `${META_API_BASE_URL}/${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Meta API request failed');
    }

    return data;
  }

  async sendTextMessage(to: string, message: string): Promise<MessageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Meta adapter not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const result = await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      });

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        externalId: result.messages?.[0]?.id,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send message to ${to}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        errorCode: error.code?.toString(),
      };
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    options?: SendTemplateOptions,
  ): Promise<MessageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Meta adapter not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const templatePayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: options?.language || 'ar',
          },
        },
      };

      if (options?.components && options.components.length > 0) {
        templatePayload.template.components = options.components;
      }

      const result = await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', templatePayload);

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        externalId: result.messages?.[0]?.id,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send template to ${to}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        errorCode: error.code?.toString(),
      };
    }
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    type: 'image' | 'audio' | 'video' | 'document',
    options?: MediaMessageOptions,
  ): Promise<MessageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Meta adapter not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const mediaPayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type,
      };

      const mediaObject: any = {
        link: mediaUrl,
      };

      if (options?.caption) {
        mediaObject.caption = options.caption;
      }

      if (type === 'document' && options?.filename) {
        mediaObject.filename = options.filename;
      }

      mediaPayload[type] = mediaObject;

      const result = await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', mediaPayload);

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        externalId: result.messages?.[0]?.id,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send media to ${to}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        errorCode: error.code?.toString(),
      };
    }
  }

  async sendLocationMessage(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<MessageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Meta adapter not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const result = await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'location',
        location: {
          latitude,
          longitude,
          name: name || '',
          address: address || '',
        },
      });

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        externalId: result.messages?.[0]?.id,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send location to ${to}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        errorCode: error.code?.toString(),
      };
    }
  }

  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${messageId}`, error);
      return false;
    }
  }

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    if (!this.appSecret) {
      this.logger.warn('Cannot verify webhook - app secret not configured');
      return false;
    }

    try {
      const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', this.appSecret)
        .update(payloadStr)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  handleVerificationChallenge(
    mode: string,
    token: string,
    challenge: string,
  ): WebhookVerificationResult {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verification successful');
      return {
        valid: true,
        challenge,
      };
    }

    this.logger.warn('Webhook verification failed - invalid token');
    return { valid: false };
  }

  parseIncomingMessage(payload: any): IncomingMessage | null {
    try {
      // Meta webhook payload structure
      const entry = payload?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) {
        return null;
      }

      const msg = value.messages[0];
      const contact = value.contacts?.[0];

      const message: IncomingMessage = {
        from: msg.from,
        messageId: msg.id,
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
        type: msg.type as IncomingMessage['type'],
      };

      // Parse content based on type
      switch (msg.type) {
        case 'text':
          message.text = msg.text?.body;
          break;

        case 'image':
          message.mediaUrl = msg.image?.id; // Will need to be downloaded via API
          message.mediaMimeType = msg.image?.mime_type;
          message.mediaCaption = msg.image?.caption;
          break;

        case 'audio':
          message.mediaUrl = msg.audio?.id;
          message.mediaMimeType = msg.audio?.mime_type;
          break;

        case 'video':
          message.mediaUrl = msg.video?.id;
          message.mediaMimeType = msg.video?.mime_type;
          message.mediaCaption = msg.video?.caption;
          break;

        case 'document':
          message.mediaUrl = msg.document?.id;
          message.mediaMimeType = msg.document?.mime_type;
          message.mediaCaption = msg.document?.caption;
          break;

        case 'location':
          message.location = {
            latitude: msg.location?.latitude,
            longitude: msg.location?.longitude,
            name: msg.location?.name,
            address: msg.location?.address,
          };
          break;

        case 'contacts':
          if (msg.contacts?.[0]) {
            const c = msg.contacts[0];
            message.contact = {
              name: c.name?.formatted_name || '',
              phones: c.phones?.map((p: any) => p.phone) || [],
            };
          }
          break;

        case 'reaction':
          message.reaction = {
            messageId: msg.reaction?.message_id,
            emoji: msg.reaction?.emoji,
          };
          break;

        case 'sticker':
          message.mediaUrl = msg.sticker?.id;
          message.mediaMimeType = msg.sticker?.mime_type;
          break;
      }

      // Add context if this is a reply
      if (msg.context) {
        message.context = {
          messageId: msg.context.id,
          from: msg.context.from,
        };
      }

      return message;
    } catch (error) {
      this.logger.error('Failed to parse incoming message', error);
      return null;
    }
  }

  parseStatusUpdate(payload: any): StatusUpdate | null {
    try {
      const entry = payload?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.statuses?.[0]) {
        return null;
      }

      const status = value.statuses[0];

      // Map Meta status to our standard status
      const statusMap: Record<string, StatusUpdate['status']> = {
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
      };

      const update: StatusUpdate = {
        messageId: status.id,
        status: statusMap[status.status] || 'sent',
        timestamp: new Date(parseInt(status.timestamp) * 1000),
        recipientId: status.recipient_id,
      };

      if (status.errors?.[0]) {
        const err = status.errors[0];
        update.error = {
          code: err.code?.toString(),
          title: err.title,
          message: err.message,
        };
      }

      return update;
    } catch (error) {
      this.logger.error('Failed to parse status update', error);
      return null;
    }
  }

  async downloadMedia(mediaId: string): Promise<{ url: string; mimeType: string } | null> {
    if (!this.isConfigured() || !mediaId) {
      return null;
    }

    try {
      // First, get the media URL from Meta
      const mediaInfo = await this.makeRequest(mediaId, 'GET');

      if (!mediaInfo.url) {
        return null;
      }

      return {
        url: mediaInfo.url,
        mimeType: mediaInfo.mime_type || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Failed to download media ${mediaId}`, error);
      return null;
    }
  }
}
