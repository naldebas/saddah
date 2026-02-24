// src/modules/integrations/whatsapp/adapters/twilio.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
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

@Injectable()
export class TwilioWhatsAppAdapter implements WhatsAppAdapter {
  private readonly logger = new Logger(TwilioWhatsAppAdapter.name);
  private client: Twilio | null = null;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly whatsappNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('whatsapp.twilio.accountSid', '');
    this.authToken = this.configService.get<string>('whatsapp.twilio.authToken', '');
    this.whatsappNumber = this.configService.get<string>('whatsapp.twilio.whatsappNumber', '');

    if (this.isConfigured()) {
      this.client = new Twilio(this.accountSid, this.authToken);
      this.logger.log('Twilio WhatsApp adapter initialized');
    } else {
      this.logger.warn('Twilio WhatsApp adapter not configured - missing credentials');
    }
  }

  getProviderName(): string {
    return 'twilio';
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.whatsappNumber);
  }

  private formatWhatsAppNumber(phoneNumber: string): string {
    // Remove any non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    // Add whatsapp: prefix for Twilio
    return `whatsapp:${formatted}`;
  }

  private getFromNumber(): string {
    return this.formatWhatsAppNumber(this.whatsappNumber);
  }

  async sendTextMessage(to: string, message: string): Promise<MessageResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio client not initialized',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const result = await this.client.messages.create({
        from: this.getFromNumber(),
        to: this.formatWhatsAppNumber(to),
        body: message,
      });

      this.logger.debug(`Message sent to ${to}: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
        externalId: result.sid,
        timestamp: result.dateCreated,
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
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio client not initialized',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      // Twilio uses Content Templates - build the content SID
      // For now, we'll use a basic approach with contentSid
      // In production, you'd map templateName to actual Twilio Content Template SIDs

      const messageOptions: any = {
        from: this.getFromNumber(),
        to: this.formatWhatsAppNumber(to),
      };

      // If template variables are provided, use contentSid approach
      if (options?.components) {
        // Extract variables from components for Twilio's contentVariables
        const variables: Record<string, string> = {};
        let varIndex = 1;

        options.components.forEach((component) => {
          component.parameters.forEach((param) => {
            if (param.text) {
              variables[varIndex.toString()] = param.text;
              varIndex++;
            }
          });
        });

        messageOptions.contentSid = templateName; // In Twilio, templateName would be a Content SID
        messageOptions.contentVariables = JSON.stringify(variables);
      } else {
        // Fallback to sending template name as body (for sandbox testing)
        messageOptions.body = `Template: ${templateName}`;
      }

      const result = await this.client.messages.create(messageOptions);

      return {
        success: true,
        messageId: result.sid,
        externalId: result.sid,
        timestamp: result.dateCreated,
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
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio client not initialized',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const result = await this.client.messages.create({
        from: this.getFromNumber(),
        to: this.formatWhatsAppNumber(to),
        mediaUrl: [mediaUrl],
        body: options?.caption || '',
      });

      return {
        success: true,
        messageId: result.sid,
        externalId: result.sid,
        timestamp: result.dateCreated,
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
    // Twilio doesn't have native location message support
    // Send as a Google Maps link instead
    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message = name
      ? `📍 ${name}\n${address || ''}\n${locationUrl}`
      : `📍 الموقع\n${locationUrl}`;

    return this.sendTextMessage(to, message);
  }

  async markAsRead(messageId: string): Promise<boolean> {
    // Twilio doesn't support marking messages as read via API
    // This is handled automatically by Twilio
    this.logger.debug(`markAsRead not supported in Twilio: ${messageId}`);
    return true;
  }

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    if (!this.authToken) {
      this.logger.warn('Cannot verify webhook - auth token not configured');
      return false;
    }

    try {
      // Twilio uses X-Twilio-Signature header
      // The signature is computed from the full URL + sorted POST params
      // For simplicity, we're doing basic validation here
      // In production, use twilio.validateRequest() with full URL

      const payloadStr = typeof payload === 'string' ? payload : payload.toString();
      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(payloadStr)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
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
    // Twilio doesn't use verification challenges like Meta
    // Webhooks are configured in Twilio console
    return { valid: true };
  }

  parseIncomingMessage(payload: any): IncomingMessage | null {
    try {
      // Twilio webhook payload structure
      const {
        MessageSid,
        From,
        Body,
        MediaUrl0,
        MediaContentType0,
        Latitude,
        Longitude,
        NumMedia,
      } = payload;

      if (!From || !MessageSid) {
        return null;
      }

      // Extract phone number from whatsapp:+1234567890 format
      const from = From.replace('whatsapp:', '');

      // Determine message type
      let type: IncomingMessage['type'] = 'text';
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;

      if (NumMedia && parseInt(NumMedia) > 0 && MediaUrl0) {
        mediaUrl = MediaUrl0;
        mediaMimeType = MediaContentType0;

        if (mediaMimeType?.startsWith('image/')) {
          type = 'image';
        } else if (mediaMimeType?.startsWith('audio/')) {
          type = 'audio';
        } else if (mediaMimeType?.startsWith('video/')) {
          type = 'video';
        } else {
          type = 'document';
        }
      } else if (Latitude && Longitude) {
        type = 'location';
      }

      const message: IncomingMessage = {
        from,
        messageId: MessageSid,
        timestamp: new Date(),
        type,
        text: Body || undefined,
        mediaUrl,
        mediaMimeType,
      };

      if (type === 'location' && Latitude && Longitude) {
        message.location = {
          latitude: parseFloat(Latitude),
          longitude: parseFloat(Longitude),
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
      const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = payload;

      if (!MessageSid || !MessageStatus) {
        return null;
      }

      // Map Twilio status to our standard status
      const statusMap: Record<string, StatusUpdate['status']> = {
        queued: 'sent',
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
        undelivered: 'failed',
      };

      const status = statusMap[MessageStatus] || 'sent';
      const recipientId = To?.replace('whatsapp:', '') || '';

      const update: StatusUpdate = {
        messageId: MessageSid,
        status,
        timestamp: new Date(),
        recipientId,
      };

      if (status === 'failed' && ErrorCode) {
        update.error = {
          code: ErrorCode,
          title: ErrorMessage || 'Message delivery failed',
        };
      }

      return update;
    } catch (error) {
      this.logger.error('Failed to parse status update', error);
      return null;
    }
  }

  async downloadMedia(mediaId: string): Promise<{ url: string; mimeType: string } | null> {
    // For Twilio, the mediaId is actually the full URL
    // Media URLs include auth, so they can be accessed directly
    if (!mediaId) {
      return null;
    }

    // Twilio media URLs are already accessible
    return {
      url: mediaId,
      mimeType: 'application/octet-stream', // Would need to fetch headers for actual type
    };
  }
}
