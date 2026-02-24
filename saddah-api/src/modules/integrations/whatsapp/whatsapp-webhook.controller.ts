// src/modules/integrations/whatsapp/whatsapp-webhook.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Public } from '../../auth/decorators/public.decorator';
import { WhatsAppAdapterFactory } from './whatsapp.factory';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { IncomingMessage, StatusUpdate } from './interfaces/whatsapp-adapter.interface';

// DTO for webhook events
export interface WebhookEvent {
  type: 'message' | 'status';
  data: IncomingMessage | StatusUpdate;
  provider: string;
  receivedAt: Date;
}

// Event names for webhook events
export const WhatsAppWebhookEvents = {
  MESSAGE_RECEIVED: 'whatsapp.webhook.message',
  STATUS_RECEIVED: 'whatsapp.webhook.status',
} as const;

// Event emitter interface for notifying other services (kept for backwards compatibility)
export interface WhatsAppWebhookHandler {
  onMessage(message: IncomingMessage): Promise<void>;
  onStatusUpdate(status: StatusUpdate): Promise<void>;
}

@ApiTags('WhatsApp Webhooks')
@Controller('webhooks/whatsapp')
@Public() // All webhook endpoints are public (no JWT)
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly adapterFactory: WhatsAppAdapterFactory,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * GET /webhooks/whatsapp
   * Webhook verification endpoint (required by Meta)
   */
  @Get()
  @ApiOperation({ summary: 'Webhook verification challenge' })
  @ApiResponse({ status: 200, description: 'Challenge accepted' })
  @ApiResponse({ status: 403, description: 'Verification failed' })
  handleVerification(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    this.logger.log(`Webhook verification request: mode=${mode}`);

    const adapter = this.adapterFactory.getAdapter();
    const result = adapter.handleVerificationChallenge(mode, token, challenge);

    if (result.valid && result.challenge) {
      this.logger.log('Webhook verification successful');
      res.status(HttpStatus.OK).send(result.challenge);
    } else {
      this.logger.warn('Webhook verification failed');
      res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }
  }

  /**
   * POST /webhooks/whatsapp
   * Receive incoming messages and status updates
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  @ApiResponse({ status: 200, description: 'Event received' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(
    @Body() body: any,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    const provider = this.configService.get<string>('whatsapp.provider', 'twilio');
    const adapter = this.adapterFactory.getAdapter();

    this.logger.debug(`Webhook received from ${provider}: ${JSON.stringify(body).substring(0, 500)}`);

    try {
      // Try to parse as incoming message
      const message = adapter.parseIncomingMessage(body);
      if (message) {
        this.logger.log(`Incoming message from ${message.from}: type=${message.type}`);
        await this.notifyMessageHandlers(message);
        return { status: 'message_received' };
      }

      // Try to parse as status update
      const statusUpdate = adapter.parseStatusUpdate(body);
      if (statusUpdate) {
        this.logger.log(`Status update for ${statusUpdate.messageId}: ${statusUpdate.status}`);
        await this.notifyStatusHandlers(statusUpdate);
        return { status: 'status_received' };
      }

      // Unknown webhook type - log and acknowledge
      this.logger.debug('Unknown webhook payload type');
      return { status: 'acknowledged' };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      // Still return 200 to prevent retries for unhandled events
      return { status: 'error_logged' };
    }
  }

  /**
   * POST /webhooks/whatsapp/status
   * Dedicated endpoint for status updates (Twilio style)
   */
  @Post('status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @Throttle({ default: { limit: 200, ttl: 60000 } }) // 200 requests per minute for status
  @ApiOperation({ summary: 'Receive WhatsApp message status updates' })
  @ApiResponse({ status: 200, description: 'Status received' })
  async handleStatusWebhook(
    @Body() body: any,
  ): Promise<{ status: string }> {
    const adapter = this.adapterFactory.getAdapter();

    this.logger.debug(`Status webhook received: ${JSON.stringify(body).substring(0, 300)}`);

    try {
      const statusUpdate = adapter.parseStatusUpdate(body);

      if (statusUpdate) {
        this.logger.log(`Status update: ${statusUpdate.messageId} -> ${statusUpdate.status}`);
        await this.notifyStatusHandlers(statusUpdate);
        return { status: 'status_received' };
      }

      return { status: 'acknowledged' };
    } catch (error) {
      this.logger.error('Error processing status webhook', error);
      return { status: 'error_logged' };
    }
  }

  /**
   * POST /webhooks/whatsapp/test
   * Test endpoint for development (only in non-production)
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleTestWebhook(
    @Body() body: any,
  ): Promise<{ status: string; parsed: any }> {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      return { status: 'disabled_in_production', parsed: null };
    }

    const adapter = this.adapterFactory.getAdapter();

    const message = adapter.parseIncomingMessage(body);
    const status = adapter.parseStatusUpdate(body);

    return {
      status: 'test_processed',
      parsed: {
        message,
        status,
        provider: adapter.getProviderName(),
      },
    };
  }

  /**
   * Notify all handlers of a new message via EventEmitter
   */
  private async notifyMessageHandlers(message: IncomingMessage): Promise<void> {
    this.eventEmitter.emit(WhatsAppWebhookEvents.MESSAGE_RECEIVED, message);
  }

  /**
   * Notify all handlers of a status update via EventEmitter
   */
  private async notifyStatusHandlers(status: StatusUpdate): Promise<void> {
    this.eventEmitter.emit(WhatsAppWebhookEvents.STATUS_RECEIVED, status);
  }
}
