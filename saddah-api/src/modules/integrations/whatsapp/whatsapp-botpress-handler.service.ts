// src/modules/integrations/whatsapp/whatsapp-botpress-handler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsAppWebhookEvents } from './whatsapp-webhook.controller';
import { WhatsAppTransformerService } from './whatsapp-transformer.service';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { WhatsAppContactSyncService } from './whatsapp-contact-sync.service';
import { IncomingMessage, StatusUpdate } from './interfaces/whatsapp-adapter.interface';
import { BotpressConfigService } from '../botpress/botpress-config.service';
import { BotpressMessageService } from '../botpress/botpress-message.service';
import {
  ConversationChannel,
  ConversationStatus,
} from '@/modules/conversations/dto/create-conversation.dto';
import { MessageDirection, MessageSender } from '@/modules/conversations/dto/send-message.dto';

@Injectable()
export class WhatsAppBotpressHandlerService {
  private readonly logger = new Logger(WhatsAppBotpressHandlerService.name);
  private readonly defaultTenantId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly transformer: WhatsAppTransformerService,
    private readonly senderService: WhatsAppSenderService,
    private readonly contactSyncService: WhatsAppContactSyncService,
    private readonly botpressConfigService: BotpressConfigService,
    private readonly botpressMessageService: BotpressMessageService,
  ) {
    this.defaultTenantId = this.configService.get<string>('DEFAULT_TENANT_ID', '');
  }

  /**
   * Handle incoming WhatsApp message (via event)
   */
  @OnEvent(WhatsAppWebhookEvents.MESSAGE_RECEIVED)
  async handleWebhookMessage(incomingMessage: IncomingMessage): Promise<void> {
    await this.onMessage(incomingMessage);
  }

  /**
   * Handle status update (via event)
   */
  @OnEvent(WhatsAppWebhookEvents.STATUS_RECEIVED)
  async handleWebhookStatus(status: StatusUpdate): Promise<void> {
    this.logger.debug(`Status update received: ${status.messageId} -> ${status.status}`);
    // Status updates are handled by the sender service
  }

  /**
   * Handle incoming WhatsApp message - routes to Botpress
   */
  async onMessage(incomingMessage: IncomingMessage): Promise<void> {
    const tenantId = this.defaultTenantId;

    try {
      // Transform the incoming message
      const message = this.transformer.transformIncomingMessage(incomingMessage);

      // Check Botpress config
      const config = await this.botpressConfigService.findByTenant(tenantId);

      if (!config?.isActive) {
        this.logger.warn(
          `Botpress not configured or not active for tenant ${tenantId}. Message dropped.`,
        );
        // Send a fallback message if no bot configured
        await this.sendFallbackMessage(tenantId, message.channelId);
        return;
      }

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(tenantId, message);

      // Save the incoming message
      await this.saveMessage(conversation.id, message);

      // Check if conversation is in human handoff mode
      if (conversation.status === 'human' || conversation.status === 'assigned') {
        this.logger.debug(`Conversation ${conversation.id} is in human mode, skipping bot`);
        return;
      }

      // Forward to Botpress
      const result = await this.botpressMessageService.forwardToBotpress({
        tenantId,
        conversationId: conversation.id,
        channelId: message.channelId,
        type: message.type as any,
        content: message.content,
        mediaUrl: message.mediaUrl,
        senderName: message.senderName,
      });

      if (result.success) {
        this.logger.debug(
          `Message forwarded to Botpress: conv=${conversation.id}, bp_conv=${result.botpressConversationId}`,
        );
      } else {
        this.logger.error(`Failed to forward message to Botpress: ${result.error}`);
        // Send error notification to user
        await this.sendErrorMessage(tenantId, message.channelId);
      }
    } catch (error: any) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
    }
  }

  /**
   * Find or create a conversation for the phone number
   */
  private async findOrCreateConversation(tenantId: string, message: any) {
    // Find existing open conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        channelId: message.channelId,
        channel: ConversationChannel.WHATSAPP,
        status: { notIn: ['closed', 'resolved'] },
      },
    });

    if (!conversation) {
      // Sync contact/lead before creating conversation
      const syncResult = await this.contactSyncService.findOrCreateFromWhatsApp(
        tenantId,
        message.channelId,
        message.senderName,
      );

      // Create new conversation
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          channel: ConversationChannel.WHATSAPP,
          channelId: message.channelId,
          status: ConversationStatus.BOT,
          qualificationData: {},
          contactId: syncResult.type === 'contact' ? syncResult.contact?.id : undefined,
        },
      });

      this.logger.log(
        `Created new conversation ${conversation.id} for ${message.channelId}`,
      );
    } else if (!conversation.contactId) {
      // Try to link existing conversation to contact
      const syncResult = await this.contactSyncService.findOrCreateFromWhatsApp(
        tenantId,
        message.channelId,
        undefined,
        conversation.id,
      );

      if (syncResult.type === 'contact' && syncResult.contact) {
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { contactId: syncResult.contact.id },
        });
      }
    }

    return conversation;
  }

  /**
   * Save incoming message to database
   */
  private async saveMessage(conversationId: string, message: any) {
    return this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        type: message.type,
        content: message.content,
        mediaUrl: message.mediaUrl,
        externalId: message.externalId,
        status: 'received',
      },
    });
  }

  /**
   * Send fallback message when Botpress is not configured
   */
  private async sendFallbackMessage(tenantId: string, to: string): Promise<void> {
    const message =
      'نعتذر، خدمة الرد الآلي غير متوفرة حالياً. سيتواصل معك أحد موظفينا قريباً.';

    await this.senderService.queueTextMessage(
      `fallback-${Date.now()}`,
      tenantId,
      '',
      to,
      message,
    );
  }

  /**
   * Send error message when Botpress fails
   */
  private async sendErrorMessage(tenantId: string, to: string): Promise<void> {
    const message =
      'نعتذر، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.';

    await this.senderService.queueTextMessage(
      `error-${Date.now()}`,
      tenantId,
      '',
      to,
      message,
    );
  }
}
