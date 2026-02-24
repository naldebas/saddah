// src/modules/integrations/whatsapp/whatsapp-status.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { StatusUpdate } from './interfaces/whatsapp-adapter.interface';
import { WhatsAppWebhookEvents } from './whatsapp-webhook.controller';

/**
 * Internal message status enum
 */
export enum DeliveryStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Status update event payload
 */
export interface DeliveryStatusEvent {
  messageId: string;
  externalId: string;
  conversationId: string;
  status: DeliveryStatus;
  previousStatus?: string;
  timestamp: Date;
  error?: {
    code: string;
    title: string;
    message?: string;
  };
}

/**
 * Events emitted by the status service
 */
export const WhatsAppStatusEvents = {
  STATUS_UPDATED: 'whatsapp.status.updated',
  MESSAGE_SENT: 'whatsapp.status.sent',
  MESSAGE_DELIVERED: 'whatsapp.status.delivered',
  MESSAGE_READ: 'whatsapp.status.read',
  MESSAGE_FAILED: 'whatsapp.status.failed',
} as const;

/**
 * Map external provider status to internal status
 */
const STATUS_MAP: Record<string, DeliveryStatus> = {
  // Twilio statuses
  queued: DeliveryStatus.QUEUED,
  sending: DeliveryStatus.SENDING,
  sent: DeliveryStatus.SENT,
  delivered: DeliveryStatus.DELIVERED,
  read: DeliveryStatus.READ,
  failed: DeliveryStatus.FAILED,
  undelivered: DeliveryStatus.FAILED,
  // Meta statuses
  accepted: DeliveryStatus.SENT,
  // Common
  success: DeliveryStatus.SENT,
  error: DeliveryStatus.FAILED,
};

@Injectable()
export class WhatsAppStatusService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('WhatsApp Status Service initialized');
  }

  /**
   * Handle status updates from webhooks (via event)
   */
  @OnEvent(WhatsAppWebhookEvents.STATUS_RECEIVED)
  async handleWebhookStatus(status: StatusUpdate): Promise<void> {
    await this.onStatusUpdate(status);
  }

  /**
   * Handle status updates from webhooks
   */
  async onStatusUpdate(status: StatusUpdate): Promise<void> {
    this.logger.debug(
      `Processing status update: ${status.messageId} -> ${status.status}`,
    );

    try {
      await this.updateDeliveryStatus(status);
    } catch (error: any) {
      this.logger.error(
        `Failed to process status update: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update message status in database
   */
  async updateDeliveryStatus(status: StatusUpdate): Promise<void> {
    // Map external status to internal
    const internalStatus = this.mapStatus(status.status);

    // Find message by external ID
    const message = await this.prisma.message.findFirst({
      where: { externalId: status.messageId },
      include: {
        conversation: {
          select: {
            id: true,
            tenantId: true,
            assignedToId: true,
            channelId: true,
          },
        },
      },
    });

    if (!message) {
      this.logger.warn(`Message not found for external ID: ${status.messageId}`);
      return;
    }

    const previousStatus = message.status;

    // Only update if status has changed or is more advanced
    if (!this.shouldUpdateStatus(previousStatus, internalStatus)) {
      this.logger.debug(
        `Skipping status update: ${previousStatus} -> ${internalStatus} (not an advancement)`,
      );
      return;
    }

    // Prepare update data
    const updateData: any = {
      status: internalStatus,
    };

    // Store error details if failed
    if (internalStatus === DeliveryStatus.FAILED && status.error) {
      updateData.errorMessage = status.error.message || status.error.title;
    }

    // Update message
    await this.prisma.message.update({
      where: { id: message.id },
      data: updateData,
    });

    this.logger.log(
      `Message ${message.id} status updated: ${previousStatus} -> ${internalStatus}`,
    );

    // Build event payload
    const eventPayload: DeliveryStatusEvent = {
      messageId: message.id,
      externalId: status.messageId,
      conversationId: message.conversationId,
      status: internalStatus,
      previousStatus,
      timestamp: status.timestamp || new Date(),
      error: status.error,
    };

    // Emit status events
    this.emitStatusEvents(eventPayload);

    // Handle failed message notifications
    if (internalStatus === DeliveryStatus.FAILED) {
      await this.handleFailedMessage(message, status, eventPayload);
    }
  }

  /**
   * Map external status string to internal DeliveryStatus
   */
  private mapStatus(externalStatus: string): DeliveryStatus {
    const status = externalStatus.toLowerCase();
    return STATUS_MAP[status] || DeliveryStatus.SENT;
  }

  /**
   * Check if we should update the status (only if advancing)
   */
  private shouldUpdateStatus(
    currentStatus: string,
    newStatus: DeliveryStatus,
  ): boolean {
    // Status progression order
    const statusOrder: DeliveryStatus[] = [
      DeliveryStatus.QUEUED,
      DeliveryStatus.SENDING,
      DeliveryStatus.SENT,
      DeliveryStatus.DELIVERED,
      DeliveryStatus.READ,
    ];

    // Failed can happen at any point
    if (newStatus === DeliveryStatus.FAILED) {
      return currentStatus !== DeliveryStatus.FAILED;
    }

    const currentIndex = statusOrder.indexOf(currentStatus as DeliveryStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    // If current status is not in order (unknown), allow update
    if (currentIndex === -1) {
      return true;
    }

    // Only update if new status is later in the progression
    return newIndex > currentIndex;
  }

  /**
   * Emit status update events
   */
  private emitStatusEvents(payload: DeliveryStatusEvent): void {
    // Emit general status updated event
    this.eventEmitter.emit(WhatsAppStatusEvents.STATUS_UPDATED, payload);

    // Emit specific status event
    switch (payload.status) {
      case DeliveryStatus.SENT:
        this.eventEmitter.emit(WhatsAppStatusEvents.MESSAGE_SENT, payload);
        break;
      case DeliveryStatus.DELIVERED:
        this.eventEmitter.emit(WhatsAppStatusEvents.MESSAGE_DELIVERED, payload);
        break;
      case DeliveryStatus.READ:
        this.eventEmitter.emit(WhatsAppStatusEvents.MESSAGE_READ, payload);
        break;
      case DeliveryStatus.FAILED:
        this.eventEmitter.emit(WhatsAppStatusEvents.MESSAGE_FAILED, payload);
        break;
    }
  }

  /**
   * Handle failed message - create notification and log
   */
  private async handleFailedMessage(
    message: any,
    status: StatusUpdate,
    event: DeliveryStatusEvent,
  ): Promise<void> {
    const conversation = message.conversation;

    if (!conversation) {
      return;
    }

    // Create notification for assigned user
    if (conversation.assignedToId) {
      const errorMessage = status.error?.message || status.error?.title || 'فشل إرسال الرسالة';
      const errorCode = status.error?.code || 'UNKNOWN';

      await this.notificationsService.create({
        tenantId: conversation.tenantId,
        userId: conversation.assignedToId,
        type: 'whatsapp_message_failed',
        title: 'فشل إرسال رسالة واتساب',
        message: `فشل إرسال الرسالة إلى ${conversation.channelId}: ${errorMessage}`,
        data: {
          conversationId: conversation.id,
          messageId: message.id,
          errorCode,
          errorMessage,
          canRetry: this.canRetry(errorCode),
        },
      });

      this.logger.log(
        `Created failure notification for user ${conversation.assignedToId}`,
      );
    }

    // Log for analytics/debugging
    this.logger.warn(
      `WhatsApp message failed: ${message.id} to ${conversation.channelId}. ` +
      `Error: ${status.error?.code} - ${status.error?.message}`,
    );
  }

  /**
   * Check if a failed message can be retried based on error code
   */
  private canRetry(errorCode: string): boolean {
    // Non-retryable error codes
    const nonRetryableCodes = [
      '63016', // Message blocked
      '63001', // Receiver not on WhatsApp
      '63007', // Phone number not valid
      '63024', // Rate limit exceeded permanently
      '470',   // Invalid recipient
      '131047', // Re-engagement message blocked
    ];

    return !nonRetryableCodes.includes(errorCode);
  }

  // ============================================
  // PUBLIC API FOR STATUS QUERIES
  // ============================================

  /**
   * Get message delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: string;
    externalId?: string;
    errorMessage?: string;
    updatedAt: Date;
  } | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        status: true,
        externalId: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    if (!message) {
      return null;
    }

    return {
      status: message.status,
      externalId: message.externalId || undefined,
      errorMessage: message.errorMessage || undefined,
      updatedAt: message.createdAt,
    };
  }

  /**
   * Get delivery statistics for a conversation
   */
  async getConversationDeliveryStats(conversationId: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }> {
    const stats = await this.prisma.message.groupBy({
      by: ['status'],
      where: {
        conversationId,
        direction: 'outbound',
      },
      _count: true,
    });

    const counts: Record<string, number> = {};
    let total = 0;

    for (const stat of stats) {
      counts[stat.status] = stat._count;
      total += stat._count;
    }

    const delivered = (counts[DeliveryStatus.DELIVERED] || 0) + (counts[DeliveryStatus.READ] || 0);
    const read = counts[DeliveryStatus.READ] || 0;

    return {
      total,
      sent: counts[DeliveryStatus.SENT] || 0,
      delivered,
      read,
      failed: counts[DeliveryStatus.FAILED] || 0,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      readRate: total > 0 ? (read / total) * 100 : 0,
    };
  }

  /**
   * Get failed messages for retry
   */
  async getFailedMessages(
    tenantId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{
    messages: any[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversation: { tenantId },
          direction: 'outbound',
          status: DeliveryStatus.FAILED,
        },
        include: {
          conversation: {
            select: {
              id: true,
              channelId: true,
              channel: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({
        where: {
          conversation: { tenantId },
          direction: 'outbound',
          status: DeliveryStatus.FAILED,
        },
      }),
    ]);

    return { messages, total };
  }

  /**
   * Retry a failed message
   */
  async retryFailedMessage(messageId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    if (message.status !== DeliveryStatus.FAILED) {
      return { success: false, error: 'Message is not in failed status' };
    }

    // Reset status to queued for retry
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: DeliveryStatus.QUEUED,
        errorMessage: null,
      },
    });

    // Emit event for sender service to pick up
    this.eventEmitter.emit('whatsapp.message.retry', {
      messageId: message.id,
      conversationId: message.conversationId,
      to: message.conversation.channelId,
      content: message.content,
      type: message.type,
    });

    this.logger.log(`Message ${messageId} queued for retry`);

    return { success: true };
  }
}
