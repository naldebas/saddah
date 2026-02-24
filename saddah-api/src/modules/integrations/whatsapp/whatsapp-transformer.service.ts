// src/modules/integrations/whatsapp/whatsapp-transformer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageType,
  MessageDirection,
  MessageSender,
  SendMessageDto,
} from '../../conversations/dto/send-message.dto';
import {
  ConversationChannel,
  CreateConversationDto,
} from '../../conversations/dto/create-conversation.dto';
import { IncomingMessage, StatusUpdate } from './interfaces/whatsapp-adapter.interface';
import { TwilioWebhookDto, TwilioStatusCallbackDto } from './dto/twilio-webhook.dto';
import { MetaWebhookDto, MetaWebhookMessage, MetaWebhookStatus } from './dto/meta-webhook.dto';

/**
 * Internal message format for processing
 */
export interface TransformedMessage {
  // Conversation identification
  channelId: string;
  channel: ConversationChannel;

  // Message details
  messageId: string;
  externalId: string;
  direction: MessageDirection;
  sender: MessageSender;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  timestamp: Date;

  // Additional data
  senderName?: string;
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
  replyToMessageId?: string;
  isForwarded?: boolean;
  buttonPayload?: string;
  listItemId?: string;
}

/**
 * Outbound message format
 */
export interface OutboundMessagePayload {
  to: string;
  type: 'text' | 'template' | 'image' | 'audio' | 'video' | 'document' | 'location';
  content?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

@Injectable()
export class WhatsAppTransformerService {
  private readonly logger = new Logger(WhatsAppTransformerService.name);
  private readonly defaultCountryCode: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultCountryCode = this.configService.get<string>('DEFAULT_COUNTRY_CODE', '966');
  }

  // ==========================================
  // PHONE NUMBER UTILITIES
  // ==========================================

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Remove whatsapp: prefix if present
    normalized = normalized.replace('whatsapp:', '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      // If starts with 00, replace with +
      if (normalized.startsWith('00')) {
        normalized = '+' + normalized.substring(2);
      }
      // If starts with 0, assume local number and add country code
      else if (normalized.startsWith('0')) {
        normalized = '+' + this.defaultCountryCode + normalized.substring(1);
      }
      // Otherwise, add + prefix
      else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Format phone number for WhatsApp (remove + for some APIs)
   */
  formatPhoneForWhatsApp(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    // Most APIs expect the number without +
    return normalized.replace('+', '');
  }

  /**
   * Extract phone number from Twilio format (whatsapp:+1234567890)
   */
  extractTwilioPhone(twilioFormat: string): string {
    return twilioFormat.replace('whatsapp:', '');
  }

  // ==========================================
  // INBOUND TRANSFORMATION
  // ==========================================

  /**
   * Transform incoming message from adapter format to internal format
   */
  transformIncomingMessage(message: IncomingMessage): TransformedMessage {
    const transformed: TransformedMessage = {
      channelId: this.normalizePhoneNumber(message.from),
      channel: ConversationChannel.WHATSAPP,
      messageId: message.messageId,
      externalId: message.messageId,
      direction: MessageDirection.INBOUND,
      sender: MessageSender.CONTACT,
      type: this.mapMessageType(message.type),
      content: message.text || '',
      mediaUrl: message.mediaUrl,
      mediaMimeType: message.mediaMimeType,
      timestamp: message.timestamp,
    };

    // Handle location
    if (message.location) {
      transformed.location = message.location;
      transformed.content = this.formatLocationText(message.location);
    }

    // Handle contact
    if (message.contact) {
      transformed.contact = message.contact;
      transformed.content = this.formatContactText(message.contact);
    }

    // Handle reaction
    if (message.reaction) {
      transformed.type = MessageType.TEXT;
      transformed.content = `[تفاعل: ${message.reaction.emoji}]`;
      transformed.replyToMessageId = message.reaction.messageId;
    }

    // Handle context (reply)
    if (message.context) {
      transformed.replyToMessageId = message.context.messageId;
    }

    return transformed;
  }

  /**
   * Transform Twilio webhook payload directly
   */
  transformTwilioWebhook(payload: TwilioWebhookDto): TransformedMessage | null {
    try {
      if (!payload.MessageSid || !payload.From) {
        return null;
      }

      const transformed: TransformedMessage = {
        channelId: this.extractTwilioPhone(payload.From),
        channel: ConversationChannel.WHATSAPP,
        messageId: payload.MessageSid,
        externalId: payload.MessageSid,
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        type: MessageType.TEXT,
        content: payload.Body || '',
        timestamp: new Date(),
        senderName: payload.ProfileName,
        isForwarded: payload.Forwarded === '1' || payload.FrequentlyForwarded === 'true',
      };

      // Handle media
      const numMedia = parseInt(payload.NumMedia || '0', 10);
      if (numMedia > 0 && payload.MediaUrl0) {
        transformed.mediaUrl = payload.MediaUrl0;
        transformed.mediaMimeType = payload.MediaContentType0;
        transformed.type = this.mimeTypeToMessageType(payload.MediaContentType0);
      }

      // Handle location
      if (payload.Latitude && payload.Longitude) {
        transformed.type = MessageType.LOCATION;
        transformed.location = {
          latitude: parseFloat(payload.Latitude),
          longitude: parseFloat(payload.Longitude),
          name: payload.Label,
          address: payload.Address,
        };
        transformed.content = this.formatLocationText(transformed.location);
      }

      // Handle button/list replies
      if (payload.ButtonPayload) {
        transformed.buttonPayload = payload.ButtonPayload;
        transformed.content = payload.ButtonText || payload.ButtonPayload;
      }
      if (payload.ListId) {
        transformed.listItemId = payload.ListId;
        transformed.content = payload.ListTitle || payload.ListId;
      }

      return transformed;
    } catch (error) {
      this.logger.error('Failed to transform Twilio webhook', error);
      return null;
    }
  }

  /**
   * Transform Meta webhook payload directly
   */
  transformMetaWebhook(payload: MetaWebhookDto): TransformedMessage[] {
    const messages: TransformedMessage[] = [];

    try {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          if (!value?.messages) continue;

          for (const msg of value.messages) {
            const transformed = this.transformMetaMessage(msg, value.contacts?.[0]);
            if (transformed) {
              messages.push(transformed);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to transform Meta webhook', error);
    }

    return messages;
  }

  /**
   * Transform a single Meta message
   */
  private transformMetaMessage(
    msg: MetaWebhookMessage,
    contact?: { wa_id: string; profile?: { name?: string } },
  ): TransformedMessage | null {
    try {
      const transformed: TransformedMessage = {
        channelId: this.normalizePhoneNumber(msg.from),
        channel: ConversationChannel.WHATSAPP,
        messageId: msg.id,
        externalId: msg.id,
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        type: this.mapMessageType(msg.type as any),
        content: '',
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
        senderName: contact?.profile?.name,
      };

      // Handle different message types
      switch (msg.type) {
        case 'text':
          transformed.content = msg.text?.body || '';
          break;

        case 'image':
          transformed.mediaUrl = msg.image?.id;
          transformed.mediaMimeType = msg.image?.mime_type;
          transformed.content = msg.image?.caption || '[صورة]';
          break;

        case 'audio':
          transformed.mediaUrl = msg.audio?.id;
          transformed.mediaMimeType = msg.audio?.mime_type;
          transformed.content = '[رسالة صوتية]';
          break;

        case 'video':
          transformed.mediaUrl = msg.video?.id;
          transformed.mediaMimeType = msg.video?.mime_type;
          transformed.content = msg.video?.caption || '[فيديو]';
          break;

        case 'document':
          transformed.mediaUrl = msg.document?.id;
          transformed.mediaMimeType = msg.document?.mime_type;
          transformed.content = msg.document?.caption || `[مستند: ${msg.document?.filename || 'ملف'}]`;
          break;

        case 'sticker':
          transformed.mediaUrl = msg.sticker?.id;
          transformed.mediaMimeType = msg.sticker?.mime_type;
          transformed.type = MessageType.IMAGE;
          transformed.content = '[ملصق]';
          break;

        case 'location':
          if (msg.location) {
            transformed.location = {
              latitude: msg.location.latitude,
              longitude: msg.location.longitude,
              name: msg.location.name,
              address: msg.location.address,
            };
            transformed.content = this.formatLocationText(transformed.location);
          }
          break;

        case 'contacts':
          if (msg.contacts?.[0]) {
            transformed.contact = {
              name: msg.contacts[0].name?.formatted_name || '',
              phones: msg.contacts[0].phones?.map((p) => p.phone) || [],
            };
            transformed.content = this.formatContactText(transformed.contact);
          }
          break;

        case 'reaction':
          if (msg.reaction) {
            transformed.content = `[تفاعل: ${msg.reaction.emoji}]`;
            transformed.replyToMessageId = msg.reaction.message_id;
          }
          break;

        case 'interactive':
          if (msg.interactive?.button_reply) {
            transformed.buttonPayload = msg.interactive.button_reply.id;
            transformed.content = msg.interactive.button_reply.title;
          } else if (msg.interactive?.list_reply) {
            transformed.listItemId = msg.interactive.list_reply.id;
            transformed.content = msg.interactive.list_reply.title;
          }
          break;
      }

      // Handle context (reply)
      if (msg.context?.id) {
        transformed.replyToMessageId = msg.context.id;
      }

      return transformed;
    } catch (error) {
      this.logger.error('Failed to transform Meta message', error);
      return null;
    }
  }

  // ==========================================
  // OUTBOUND TRANSFORMATION
  // ==========================================

  /**
   * Transform internal message to outbound payload
   */
  transformOutboundMessage(
    to: string,
    message: SendMessageDto,
  ): OutboundMessagePayload {
    const payload: OutboundMessagePayload = {
      to: this.formatPhoneForWhatsApp(to),
      type: this.messageTypeToOutbound(message.type || MessageType.TEXT),
    };

    switch (message.type) {
      case MessageType.TEXT:
      default:
        payload.type = 'text';
        payload.content = message.content;
        break;

      case MessageType.IMAGE:
        payload.type = 'image';
        payload.mediaUrl = message.mediaUrl;
        payload.caption = message.content;
        break;

      case MessageType.AUDIO:
        payload.type = 'audio';
        payload.mediaUrl = message.mediaUrl;
        break;

      case MessageType.VIDEO:
        payload.type = 'video';
        payload.mediaUrl = message.mediaUrl;
        payload.caption = message.content;
        break;

      case MessageType.DOCUMENT:
        payload.type = 'document';
        payload.mediaUrl = message.mediaUrl;
        payload.caption = message.content;
        break;

      case MessageType.TEMPLATE:
        payload.type = 'template';
        payload.templateName = message.content;
        break;
    }

    return payload;
  }

  /**
   * Create a conversation DTO from transformed message
   */
  createConversationDto(message: TransformedMessage): CreateConversationDto {
    return {
      channel: message.channel,
      channelId: message.channelId,
      status: undefined, // Will use default 'bot'
    };
  }

  /**
   * Create a send message DTO from transformed message
   */
  createSendMessageDto(message: TransformedMessage): SendMessageDto {
    return {
      direction: message.direction,
      sender: message.sender,
      type: message.type,
      content: message.content,
      mediaUrl: message.mediaUrl,
      externalId: message.externalId,
    };
  }

  // ==========================================
  // STATUS TRANSFORMATION
  // ==========================================

  /**
   * Transform Twilio status callback
   */
  transformTwilioStatus(payload: TwilioStatusCallbackDto): StatusUpdate | null {
    try {
      const statusMap: Record<string, StatusUpdate['status']> = {
        queued: 'sent',
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
        undelivered: 'failed',
      };

      return {
        messageId: payload.MessageSid,
        status: statusMap[payload.MessageStatus] || 'sent',
        timestamp: new Date(),
        recipientId: payload.To ? this.extractTwilioPhone(payload.To) : '',
        error: payload.ErrorCode
          ? {
              code: payload.ErrorCode,
              title: payload.ErrorMessage || 'Delivery failed',
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to transform Twilio status', error);
      return null;
    }
  }

  /**
   * Transform Meta status update
   */
  transformMetaStatus(status: MetaWebhookStatus): StatusUpdate | null {
    try {
      const statusMap: Record<string, StatusUpdate['status']> = {
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
      };

      return {
        messageId: status.id,
        status: statusMap[status.status] || 'sent',
        timestamp: new Date(parseInt(status.timestamp) * 1000),
        recipientId: status.recipient_id,
        error: status.errors?.[0]
          ? {
              code: status.errors[0].code.toString(),
              title: status.errors[0].title,
              message: status.errors[0].message,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to transform Meta status', error);
      return null;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Map incoming message type to internal MessageType
   */
  private mapMessageType(type: IncomingMessage['type']): MessageType {
    const typeMap: Record<string, MessageType> = {
      text: MessageType.TEXT,
      image: MessageType.IMAGE,
      audio: MessageType.AUDIO,
      video: MessageType.VIDEO,
      document: MessageType.DOCUMENT,
      location: MessageType.LOCATION,
      contact: MessageType.CONTACT,
      sticker: MessageType.IMAGE, // Treat stickers as images
      reaction: MessageType.TEXT, // Treat reactions as text
    };

    return typeMap[type] || MessageType.TEXT;
  }

  /**
   * Map MIME type to MessageType
   */
  private mimeTypeToMessageType(mimeType?: string): MessageType {
    if (!mimeType) return MessageType.DOCUMENT;

    if (mimeType.startsWith('image/')) return MessageType.IMAGE;
    if (mimeType.startsWith('audio/')) return MessageType.AUDIO;
    if (mimeType.startsWith('video/')) return MessageType.VIDEO;

    return MessageType.DOCUMENT;
  }

  /**
   * Map MessageType to outbound type string
   */
  private messageTypeToOutbound(
    type: MessageType,
  ): OutboundMessagePayload['type'] {
    const typeMap: Record<MessageType, OutboundMessagePayload['type']> = {
      [MessageType.TEXT]: 'text',
      [MessageType.IMAGE]: 'image',
      [MessageType.AUDIO]: 'audio',
      [MessageType.VIDEO]: 'video',
      [MessageType.DOCUMENT]: 'document',
      [MessageType.LOCATION]: 'location',
      [MessageType.CONTACT]: 'text', // Send contact info as text
      [MessageType.TEMPLATE]: 'template',
    };

    return typeMap[type] || 'text';
  }

  /**
   * Format location as text
   */
  private formatLocationText(location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }): string {
    const parts: string[] = ['📍 موقع'];

    if (location.name) {
      parts.push(location.name);
    }
    if (location.address) {
      parts.push(location.address);
    }

    parts.push(`https://maps.google.com/?q=${location.latitude},${location.longitude}`);

    return parts.join('\n');
  }

  /**
   * Format contact as text
   */
  private formatContactText(contact: { name: string; phones: string[] }): string {
    const parts: string[] = [`👤 ${contact.name}`];

    for (const phone of contact.phones) {
      parts.push(`📱 ${phone}`);
    }

    return parts.join('\n');
  }
}
