// src/modules/integrations/whatsapp/whatsapp-message.processor.ts
import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { WHATSAPP_QUEUE } from './constants';
import { WhatsAppSenderService, MessageJobData } from './whatsapp-sender.service';
import { MessageResult } from './interfaces/whatsapp-adapter.interface';

@Processor(WHATSAPP_QUEUE)
export class WhatsAppMessageProcessor {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name);

  constructor(private readonly senderService: WhatsAppSenderService) {}

  /**
   * Process send message jobs
   */
  @Process('send')
  async handleSend(job: Job<MessageJobData>): Promise<MessageResult> {
    this.logger.debug(`Processing send job ${job.id}`);

    const result = await this.senderService.processMessageJob(job);

    if (!result.success) {
      // Throw error to trigger retry
      throw new Error(result.error || 'Message send failed');
    }

    return result;
  }

  /**
   * Called when a job becomes active
   */
  @OnQueueActive()
  onActive(job: Job<MessageJobData>): void {
    this.logger.debug(
      `Job ${job.id} is now active. Attempt: ${job.attemptsMade + 1}`,
    );
  }

  /**
   * Called when a job completes successfully
   */
  @OnQueueCompleted()
  onCompleted(job: Job<MessageJobData>, result: MessageResult): void {
    this.logger.log(
      `Job ${job.id} completed. Message sent to ${job.data.to}. External ID: ${result.externalId}`,
    );
  }

  /**
   * Called when a job fails
   */
  @OnQueueFailed()
  onFailed(job: Job<MessageJobData>, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts. Error: ${error.message}`,
    );

    // Log additional details for debugging
    if (job.attemptsMade >= job.opts.attempts!) {
      this.logger.error(
        `Job ${job.id} has exhausted all retries. Moving to failed queue.`,
        {
          messageId: job.data.id,
          conversationId: job.data.conversationId,
          to: job.data.to,
          type: job.data.type,
        },
      );
    }
  }
}
