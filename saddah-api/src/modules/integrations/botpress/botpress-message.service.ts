// src/modules/integrations/botpress/botpress-message.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { BotpressConfigService } from './botpress-config.service';
import { BotpressClientService } from './botpress-client.service';
import { BotpressSyncService } from './botpress-sync.service';
import { BotpressInternalEvents, BotpressMessage } from './interfaces';

export interface ForwardMessageResult {
  success: boolean;
  botpressConversationId?: string;
  botpressMessageId?: string;
  error?: string;
}

export interface IncomingWhatsAppMessage {
  tenantId: string;
  conversationId: string;
  channelId: string; // WhatsApp phone number
  type: 'text' | 'image' | 'audio' | 'document' | 'location';
  content: string;
  mediaUrl?: string;
  senderName?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class BotpressMessageService {
  private readonly logger = new Logger(BotpressMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: BotpressConfigService,
    private readonly clientService: BotpressClientService,
    private readonly syncService: BotpressSyncService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Forward an incoming WhatsApp message to Botpress
   */
  async forwardToBotpress(message: IncomingWhatsAppMessage): Promise<ForwardMessageResult> {
    const { tenantId, conversationId, channelId, type, content, mediaUrl, senderName, metadata } =
      message;

    try {
      // Get Botpress config with credentials
      const configData = await this.configService.getConfigWithCredentials(tenantId);

      if (!configData) {
        return {
          success: false,
          error: 'Botpress not configured for this tenant',
        };
      }

      const { config, credentials } = configData;

      if (!config.isActive) {
        return {
          success: false,
          error: 'Botpress integration is not active',
        };
      }

      // Ensure Botpress conversation exists
      const botpressConv = await this.syncService.ensureBotpressConversation(
        tenantId,
        conversationId,
        channelId,
        senderName,
      );

      if (!botpressConv) {
        return {
          success: false,
          error: 'Failed to create/sync Botpress conversation',
        };
      }

      // Convert message to Botpress format
      const botpressMessage = this.convertToBotpressMessage(type, content, mediaUrl);

      // Send to Botpress
      const response = await this.clientService.sendMessage(
        config.botId,
        credentials,
        botpressConv.botpressConvId,
        channelId, // Use phone number as user ID
        botpressMessage,
        {
          source: 'whatsapp',
          originalConversationId: conversationId,
          ...(metadata || {}),
        },
      );

      // Update last synced
      await this.syncService.updateLastSynced(botpressConv.id);

      this.eventEmitter.emit(BotpressInternalEvents.MESSAGE_FORWARDED, {
        tenantId,
        conversationId,
        botpressConversationId: botpressConv.botpressConvId,
        messageType: type,
      });

      this.logger.debug(
        `Forwarded message to Botpress: conv=${conversationId}, bp_conv=${botpressConv.botpressConvId}`,
      );

      return {
        success: true,
        botpressConversationId: botpressConv.botpressConvId,
        botpressMessageId: response.message.id,
      };
    } catch (error: any) {
      this.logger.error(`Failed to forward message to Botpress: ${error.message}`, error.stack);

      this.eventEmitter.emit(BotpressInternalEvents.ERROR, {
        tenantId,
        conversationId,
        error: error.message,
        operation: 'forward_message',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a bot response from Botpress back to WhatsApp
   * This is called when Botpress webhook receives an outgoing message
   */
  async sendBotResponse(
    tenantId: string,
    botpressConversationId: string,
    message: BotpressMessage,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the Saddah conversation linked to this Botpress conversation
      const botpressConv = await this.prisma.botpressConversation.findFirst({
        where: {
          tenantId,
          botpressConvId: botpressConversationId,
        },
      });

      if (!botpressConv) {
        return {
          success: false,
          error: 'Conversation mapping not found',
        };
      }

      // Get the Saddah conversation
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: botpressConv.conversationId },
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Saddah conversation not found',
        };
      }

      // Save the bot message to Saddah
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'outbound',
          sender: 'bot',
          type: message.type || 'text',
          content: message.text || '',
          status: 'queued',
        },
      });

      // The WhatsApp sender service will pick this up and send via Twilio/Meta
      // We just emit an event here for the WhatsApp module to handle
      this.eventEmitter.emit('whatsapp.message.send', {
        tenantId,
        conversationId: conversation.id,
        channelId: conversation.channelId,
        type: message.type || 'text',
        content: message.text || '',
        imageUrl: message.imageUrl,
        audioUrl: message.audioUrl,
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send bot response: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert WhatsApp message type to Botpress message format
   */
  private convertToBotpressMessage(
    type: string,
    content: string,
    mediaUrl?: string,
  ): BotpressMessage {
    switch (type) {
      case 'image':
        return {
          type: 'image',
          imageUrl: mediaUrl,
          text: content || undefined,
        };
      case 'audio':
        return {
          type: 'audio',
          audioUrl: mediaUrl,
          text: content || undefined,
        };
      case 'document':
        return {
          type: 'file',
          fileUrl: mediaUrl,
          text: content || undefined,
        };
      case 'text':
      default:
        return {
          type: 'text',
          text: content,
        };
    }
  }
}
