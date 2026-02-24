// src/modules/integrations/whatsapp/whatsapp-sender.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { WHATSAPP_QUEUE } from './constants';
import {
  WhatsAppAdapter,
  WHATSAPP_ADAPTER,
  MessageResult,
  SendTemplateOptions,
  MediaMessageOptions,
} from './interfaces/whatsapp-adapter.interface';
import { WhatsAppTransformerService } from './whatsapp-transformer.service';
import { WhatsAppQuotaService } from './whatsapp-quota.service';

/**
 * Message job data for queue processing
 */
export interface MessageJobData {
  id: string;
  tenantId: string;
  conversationId: string;
  to: string;
  type: 'text' | 'template' | 'image' | 'audio' | 'video' | 'document' | 'location';
  content?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  templateName?: string;
  templateOptions?: SendTemplateOptions;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  attempts?: number;
}

/**
 * Message send result
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
  errorCode?: string;
  queuedJobId?: string;
}

/**
 * Message status
 */
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Events emitted by the sender service
 */
export const WhatsAppSenderEvents = {
  MESSAGE_QUEUED: 'whatsapp.message.queued',
  MESSAGE_SENDING: 'whatsapp.message.sending',
  MESSAGE_SENT: 'whatsapp.message.sent',
  MESSAGE_FAILED: 'whatsapp.message.failed',
  MESSAGE_STATUS_UPDATED: 'whatsapp.message.status_updated',
} as const;

@Injectable()
export class WhatsAppSenderService {
  private readonly logger = new Logger(WhatsAppSenderService.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    @Inject(WHATSAPP_ADAPTER)
    private readonly adapter: WhatsAppAdapter,
    @InjectQueue(WHATSAPP_QUEUE)
    private readonly messageQueue: Queue<MessageJobData>,
    private readonly configService: ConfigService,
    private readonly transformer: WhatsAppTransformerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly quotaService: WhatsAppQuotaService,
  ) {
    this.maxRetries = this.configService.get<number>('whatsapp.maxBotRetries', 3);
    this.retryDelayMs = this.configService.get<number>('WHATSAPP_RETRY_DELAY_MS', 1000);
  }

  // ==========================================
  // DIRECT SENDING (Synchronous)
  // ==========================================

  /**
   * Send a text message directly (synchronous)
   */
  async sendTextMessage(to: string, content: string): Promise<SendResult> {
    const normalizedTo = this.transformer.formatPhoneForWhatsApp(to);

    this.logger.debug(`Sending text message to ${normalizedTo}`);

    const result = await this.adapter.sendTextMessage(normalizedTo, content);

    return this.mapResult(result);
  }

  /**
   * Send a template message directly (synchronous)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    options?: SendTemplateOptions,
  ): Promise<SendResult> {
    const normalizedTo = this.transformer.formatPhoneForWhatsApp(to);

    this.logger.debug(`Sending template "${templateName}" to ${normalizedTo}`);

    const result = await this.adapter.sendTemplateMessage(
      normalizedTo,
      templateName,
      options,
    );

    return this.mapResult(result);
  }

  /**
   * Send a media message directly (synchronous)
   */
  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    type: 'image' | 'audio' | 'video' | 'document',
    options?: MediaMessageOptions,
  ): Promise<SendResult> {
    const normalizedTo = this.transformer.formatPhoneForWhatsApp(to);

    this.logger.debug(`Sending ${type} to ${normalizedTo}`);

    const result = await this.adapter.sendMediaMessage(
      normalizedTo,
      mediaUrl,
      type,
      options,
    );

    return this.mapResult(result);
  }

  /**
   * Send a location message directly (synchronous)
   */
  async sendLocationMessage(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<SendResult> {
    const normalizedTo = this.transformer.formatPhoneForWhatsApp(to);

    this.logger.debug(`Sending location to ${normalizedTo}`);

    const result = await this.adapter.sendLocationMessage(
      normalizedTo,
      latitude,
      longitude,
      name,
      address,
    );

    return this.mapResult(result);
  }

  // ==========================================
  // QUEUED SENDING (Asynchronous)
  // ==========================================

  /**
   * Queue a message for async sending
   */
  async queueMessage(data: Omit<MessageJobData, 'createdAt'>): Promise<SendResult> {
    try {
      // Check tenant quota
      const quotaCheck = await this.quotaService.canSendMessage(data.tenantId);
      if (!quotaCheck.allowed) {
        this.logger.warn(`Quota exceeded for tenant ${data.tenantId}: ${quotaCheck.reason}`);
        return {
          success: false,
          error: quotaCheck.reason || 'Quota exceeded',
          errorCode: 'QUOTA_EXCEEDED',
        };
      }

      // Check per-contact rate limit
      const rateLimitCheck = this.quotaService.checkContactRateLimit(data.tenantId, data.to);
      if (!rateLimitCheck.allowed) {
        this.logger.warn(`Rate limit exceeded for contact ${data.to}`);
        return {
          success: false,
          error: `Rate limit exceeded. Retry after ${Math.ceil(rateLimitCheck.retryAfterMs! / 1000)} seconds`,
          errorCode: 'RATE_LIMIT_EXCEEDED',
        };
      }

      const jobData: MessageJobData = {
        ...data,
        createdAt: new Date(),
        attempts: 0,
      };

      const job = await this.messageQueue.add('send', jobData, {
        attempts: this.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.retryDelayMs,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      // Record the message for rate limiting and quota
      this.quotaService.recordContactMessage(data.tenantId, data.to);
      await this.quotaService.incrementUsage(data.tenantId, 1);

      this.logger.debug(`Message queued with job ID: ${job.id}`);

      // Emit queued event
      this.eventEmitter.emit(WhatsAppSenderEvents.MESSAGE_QUEUED, {
        jobId: job.id,
        messageId: data.id,
        conversationId: data.conversationId,
        to: data.to,
      });

      return {
        success: true,
        queuedJobId: job.id?.toString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to queue message: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Queue a text message
   */
  async queueTextMessage(
    id: string,
    tenantId: string,
    conversationId: string,
    to: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<SendResult> {
    return this.queueMessage({
      id,
      tenantId,
      conversationId,
      to,
      type: 'text',
      content,
      metadata,
    });
  }

  /**
   * Queue a template message
   */
  async queueTemplateMessage(
    id: string,
    tenantId: string,
    conversationId: string,
    to: string,
    templateName: string,
    templateOptions?: SendTemplateOptions,
    metadata?: Record<string, any>,
  ): Promise<SendResult> {
    return this.queueMessage({
      id,
      tenantId,
      conversationId,
      to,
      type: 'template',
      templateName,
      templateOptions,
      metadata,
    });
  }

  /**
   * Queue a media message
   */
  async queueMediaMessage(
    id: string,
    tenantId: string,
    conversationId: string,
    to: string,
    mediaUrl: string,
    type: 'image' | 'audio' | 'video' | 'document',
    caption?: string,
    filename?: string,
    metadata?: Record<string, any>,
  ): Promise<SendResult> {
    return this.queueMessage({
      id,
      tenantId,
      conversationId,
      to,
      type,
      mediaUrl,
      caption,
      filename,
      metadata,
    });
  }

  // ==========================================
  // QUEUE PROCESSING
  // ==========================================

  /**
   * Process a queued message job
   * This is called by the Bull processor
   */
  async processMessageJob(job: Job<MessageJobData>): Promise<MessageResult> {
    const { data } = job;

    this.logger.debug(`Processing message job ${job.id} (attempt ${job.attemptsMade + 1})`);

    // Emit sending event
    this.eventEmitter.emit(WhatsAppSenderEvents.MESSAGE_SENDING, {
      jobId: job.id,
      messageId: data.id,
      conversationId: data.conversationId,
      attempt: job.attemptsMade + 1,
    });

    let result: MessageResult;

    try {
      switch (data.type) {
        case 'text':
          result = await this.adapter.sendTextMessage(data.to, data.content || '');
          break;

        case 'template':
          result = await this.adapter.sendTemplateMessage(
            data.to,
            data.templateName || '',
            data.templateOptions,
          );
          break;

        case 'image':
        case 'audio':
        case 'video':
        case 'document':
          result = await this.adapter.sendMediaMessage(
            data.to,
            data.mediaUrl || '',
            data.type,
            {
              caption: data.caption,
              filename: data.filename,
            },
          );
          break;

        case 'location':
          if (data.location) {
            result = await this.adapter.sendLocationMessage(
              data.to,
              data.location.latitude,
              data.location.longitude,
              data.location.name,
              data.location.address,
            );
          } else {
            result = { success: false, error: 'Location data missing' };
          }
          break;

        default:
          result = { success: false, error: `Unknown message type: ${data.type}` };
      }

      if (result.success) {
        // Emit sent event
        this.eventEmitter.emit(WhatsAppSenderEvents.MESSAGE_SENT, {
          jobId: job.id,
          messageId: data.id,
          conversationId: data.conversationId,
          externalId: result.externalId,
        });
      } else {
        // Will be retried if attempts remaining
        this.logger.warn(`Message send failed: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error processing message job: ${error.message}`);

      // If this is the last attempt, emit failed event
      if (job.attemptsMade >= this.maxRetries - 1) {
        this.eventEmitter.emit(WhatsAppSenderEvents.MESSAGE_FAILED, {
          jobId: job.id,
          messageId: data.id,
          conversationId: data.conversationId,
          error: error.message,
          attempts: job.attemptsMade + 1,
        });
      }

      throw error; // Re-throw to trigger retry
    }
  }

  // ==========================================
  // QUEUE MANAGEMENT
  // ==========================================

  /**
   * Get pending jobs count
   */
  async getPendingJobsCount(): Promise<number> {
    return this.messageQueue.getWaitingCount();
  }

  /**
   * Get active jobs count
   */
  async getActiveJobsCount(): Promise<number> {
    return this.messageQueue.getActiveCount();
  }

  /**
   * Get failed jobs count
   */
  async getFailedJobsCount(): Promise<number> {
    return this.messageQueue.getFailedCount();
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(start = 0, end = 10): Promise<Job<MessageJobData>[]> {
    return this.messageQueue.getFailed(start, end);
  }

  /**
   * Retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.messageQueue.getJob(jobId);
      if (job) {
        await job.retry();
        this.logger.debug(`Retrying job ${jobId}`);
        return true;
      }
      return false;
    } catch (error: any) {
      this.logger.error(`Failed to retry job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Retry all failed jobs
   */
  async retryAllFailedJobs(): Promise<number> {
    const failedJobs = await this.messageQueue.getFailed(0, 100);
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}`);
      }
    }

    this.logger.log(`Retried ${retried} failed jobs`);
    return retried;
  }

  /**
   * Remove a failed job
   */
  async removeFailedJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.messageQueue.getJob(jobId);
      if (job) {
        await job.remove();
        return true;
      }
      return false;
    } catch (error: any) {
      this.logger.error(`Failed to remove job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean old completed jobs
   */
  async cleanCompletedJobs(grace = 3600000): Promise<Job<MessageJobData>[]> {
    return this.messageQueue.clean(grace, 'completed');
  }

  /**
   * Clean old failed jobs
   */
  async cleanFailedJobs(grace = 86400000): Promise<Job<MessageJobData>[]> {
    return this.messageQueue.clean(grace, 'failed');
  }

  // ==========================================
  // STATUS UPDATES
  // ==========================================

  /**
   * Emit a status update event
   */
  emitStatusUpdate(
    messageId: string,
    externalId: string,
    status: MessageStatus,
    error?: { code: string; message: string },
  ): void {
    this.eventEmitter.emit(WhatsAppSenderEvents.MESSAGE_STATUS_UPDATED, {
      messageId,
      externalId,
      status,
      error,
      timestamp: new Date(),
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Map adapter result to send result
   */
  private mapResult(result: MessageResult): SendResult {
    return {
      success: result.success,
      messageId: result.messageId,
      externalId: result.externalId,
      error: result.error,
      errorCode: result.errorCode,
    };
  }

  /**
   * Check if adapter is configured
   */
  isConfigured(): boolean {
    return this.adapter.isConfigured();
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.adapter.getProviderName();
  }
}
