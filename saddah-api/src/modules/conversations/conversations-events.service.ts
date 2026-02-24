// src/modules/conversations/conversations-events.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConversationsGateway,
  NewConversationPayload,
  NewMessagePayload,
  MessageStatusPayload,
} from './conversations.gateway';
import { WhatsAppBotEvents } from '../integrations/whatsapp/whatsapp-bot.service';
import { WhatsAppStatusEvents } from '../integrations/whatsapp/whatsapp-status.service';
import { WhatsAppSenderEvents } from '../integrations/whatsapp/whatsapp-sender.service';

@Injectable()
export class ConversationsEventsService {
  private readonly logger = new Logger(ConversationsEventsService.name);

  constructor(
    private readonly gateway: ConversationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // WHATSAPP BOT EVENTS
  // ============================================

  /**
   * Handle new conversation started
   */
  @OnEvent(WhatsAppBotEvents.CONVERSATION_STARTED)
  async handleConversationStarted(payload: {
    conversationId: string;
    channelId: string;
    contactSyncResult?: string;
    contactId?: string;
    leadId?: string;
  }) {
    this.logger.debug(`Conversation started: ${payload.conversationId}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        include: {
          contact: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!conversation) return;

      const contactName = conversation.contact
        ? `${conversation.contact.firstName} ${conversation.contact.lastName}`.trim()
        : payload.channelId;

      const eventPayload: NewConversationPayload = {
        conversationId: conversation.id,
        channel: conversation.channel,
        channelId: conversation.channelId,
        status: conversation.status,
        contactName,
        createdAt: conversation.createdAt,
      };

      this.gateway.emitNewConversation(conversation.tenantId, eventPayload);
    } catch (error) {
      this.logger.error(`Error handling conversation started: ${error.message}`);
    }
  }

  /**
   * Handle message processed by bot
   */
  @OnEvent(WhatsAppBotEvents.MESSAGE_PROCESSED)
  async handleMessageProcessed(payload: {
    conversationId: string;
    state: string;
    qualificationScore: number;
  }) {
    this.logger.debug(`Message processed for conversation: ${payload.conversationId}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      this.gateway.emitConversationUpdated(
        conversation.tenantId,
        payload.conversationId,
        {
          qualificationState: payload.state,
          qualificationScore: payload.qualificationScore,
        },
      );
    } catch (error) {
      this.logger.error(`Error handling message processed: ${error.message}`);
    }
  }

  /**
   * Handle bot response sent
   */
  @OnEvent(WhatsAppBotEvents.RESPONSE_SENT)
  async handleResponseSent(payload: {
    conversationId: string;
    messageId: string;
    to: string;
  }) {
    this.logger.debug(`Response sent for conversation: ${payload.conversationId}`);

    try {
      const message = await this.prisma.message.findUnique({
        where: { id: payload.messageId },
        include: {
          conversation: {
            select: { tenantId: true },
          },
        },
      });

      if (!message) return;

      const eventPayload: NewMessagePayload = {
        conversationId: payload.conversationId,
        messageId: message.id,
        direction: 'outbound',
        sender: message.sender,
        type: message.type,
        content: message.content,
        mediaUrl: message.mediaUrl || undefined,
        timestamp: message.createdAt,
      };

      this.gateway.emitNewMessage(
        message.conversation.tenantId,
        payload.conversationId,
        eventPayload,
      );
    } catch (error) {
      this.logger.error(`Error handling response sent: ${error.message}`);
    }
  }

  /**
   * Handle handoff triggered
   */
  @OnEvent(WhatsAppBotEvents.HANDOFF_TRIGGERED)
  async handleHandoffTriggered(payload: {
    conversationId: string;
    reason: string;
    qualificationData: any;
  }) {
    this.logger.debug(`Handoff triggered for conversation: ${payload.conversationId}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { tenantId: true, status: true },
      });

      if (!conversation) return;

      this.gateway.emitConversationUpdated(
        conversation.tenantId,
        payload.conversationId,
        {
          status: conversation.status,
          handoffReason: payload.reason,
          requiresAttention: true,
        },
      );
    } catch (error) {
      this.logger.error(`Error handling handoff: ${error.message}`);
    }
  }

  // ============================================
  // WHATSAPP STATUS EVENTS
  // ============================================

  /**
   * Handle message status updated
   */
  @OnEvent(WhatsAppStatusEvents.STATUS_UPDATED)
  async handleStatusUpdated(payload: {
    messageId: string;
    externalId: string;
    conversationId: string;
    status: string;
    timestamp: Date;
  }) {
    this.logger.debug(`Status updated: ${payload.messageId} -> ${payload.status}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      const eventPayload: MessageStatusPayload = {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        status: payload.status,
        timestamp: payload.timestamp,
      };

      this.gateway.emitMessageStatus(
        conversation.tenantId,
        payload.conversationId,
        eventPayload,
      );
    } catch (error) {
      this.logger.error(`Error handling status update: ${error.message}`);
    }
  }

  // ============================================
  // WHATSAPP SENDER EVENTS
  // ============================================

  /**
   * Handle message queued
   */
  @OnEvent(WhatsAppSenderEvents.MESSAGE_QUEUED)
  async handleMessageQueued(payload: {
    jobId: string;
    messageId: string;
    conversationId: string;
    to: string;
  }) {
    this.logger.debug(`Message queued: ${payload.messageId}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      this.gateway.emitMessageStatus(
        conversation.tenantId,
        payload.conversationId,
        {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
          status: 'queued',
          timestamp: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(`Error handling message queued: ${error.message}`);
    }
  }

  /**
   * Handle message sent
   */
  @OnEvent(WhatsAppSenderEvents.MESSAGE_SENT)
  async handleMessageSent(payload: {
    jobId: string;
    messageId: string;
    conversationId: string;
    externalId: string;
  }) {
    this.logger.debug(`Message sent: ${payload.messageId}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      this.gateway.emitMessageStatus(
        conversation.tenantId,
        payload.conversationId,
        {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
          status: 'sent',
          timestamp: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(`Error handling message sent: ${error.message}`);
    }
  }

  /**
   * Handle message failed
   */
  @OnEvent(WhatsAppSenderEvents.MESSAGE_FAILED)
  async handleMessageFailed(payload: {
    jobId: string;
    messageId: string;
    conversationId: string;
    error: string;
    attempts: number;
  }) {
    this.logger.debug(`Message failed: ${payload.messageId}`);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      this.gateway.emitMessageStatus(
        conversation.tenantId,
        payload.conversationId,
        {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
          status: 'failed',
          timestamp: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(`Error handling message failed: ${error.message}`);
    }
  }

  // ============================================
  // MANUAL EMIT METHODS (for use by services)
  // ============================================

  /**
   * Emit new inbound message event
   */
  async emitInboundMessage(
    conversationId: string,
    message: {
      id: string;
      sender: string;
      type: string;
      content: string;
      mediaUrl?: string;
      createdAt: Date;
    },
  ) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      const eventPayload: NewMessagePayload = {
        conversationId,
        messageId: message.id,
        direction: 'inbound',
        sender: message.sender,
        type: message.type,
        content: message.content,
        mediaUrl: message.mediaUrl,
        timestamp: message.createdAt,
      };

      this.gateway.emitNewMessage(
        conversation.tenantId,
        conversationId,
        eventPayload,
      );
    } catch (error) {
      this.logger.error(`Error emitting inbound message: ${error.message}`);
    }
  }

  /**
   * Emit conversation assigned event
   */
  async emitConversationAssigned(
    conversationId: string,
    assignedToId: string,
    assignedToName: string,
    assignedById?: string,
  ) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { tenantId: true },
      });

      if (!conversation) return;

      this.gateway.emitConversationAssigned(conversation.tenantId, {
        conversationId,
        assignedToId,
        assignedToName,
        assignedById,
      });
    } catch (error) {
      this.logger.error(`Error emitting conversation assigned: ${error.message}`);
    }
  }
}
