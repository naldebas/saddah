// src/modules/integrations/botpress/botpress-webhook.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { BotpressConfigService } from './botpress-config.service';
import { BotpressMessageService } from './botpress-message.service';
import { BotpressQualificationProcessor } from './botpress-qualification.processor';
import { BotpressSyncService } from './botpress-sync.service';
import { BotpressWebhookDto } from './dto';

@ApiTags('Botpress Webhooks')
@Controller('webhooks/botpress')
export class BotpressWebhookController {
  private readonly logger = new Logger(BotpressWebhookController.name);

  constructor(
    private readonly configService: BotpressConfigService,
    private readonly messageService: BotpressMessageService,
    private readonly qualificationProcessor: BotpressQualificationProcessor,
    private readonly syncService: BotpressSyncService,
  ) {}

  @Post(':tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Botpress webhook events' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(
    @Param('tenantId') tenantId: string,
    @Headers('x-bp-signature') signature: string,
    @Body() body: BotpressWebhookDto,
  ): Promise<{ received: boolean }> {
    this.logger.debug(`Received Botpress webhook for tenant ${tenantId}: ${body.type}`);

    // Verify signature
    const isValid = await this.verifySignature(tenantId, signature, body);
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for tenant ${tenantId}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process event based on type
    try {
      switch (body.type) {
        case 'message':
          await this.handleMessageEvent(tenantId, body);
          break;

        case 'qualification_complete':
          await this.handleQualificationComplete(tenantId, body);
          break;

        case 'handoff_requested':
          await this.handleHandoffRequested(tenantId, body);
          break;

        case 'state_changed':
          await this.handleStateChanged(tenantId, body);
          break;

        case 'conversation_ended':
          await this.handleConversationEnded(tenantId, body);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${body.type}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process event: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature or validate by botId matching
   */
  private async verifySignature(
    tenantId: string,
    signature: string,
    body: any,
  ): Promise<boolean> {
    // Get config to retrieve webhook secret and botId
    const configData = await this.configService.getConfigWithCredentials(tenantId);
    if (!configData) {
      return false;
    }

    // If signature is provided, verify HMAC
    if (signature) {
      const { credentials } = configData;
      if (!credentials.webhookSecret) {
        return false;
      }

      // Compute expected signature
      const payload = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', credentials.webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (timing-safe comparison)
      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature),
        );
      } catch {
        return false;
      }
    }

    // No signature: allow if the botId in payload matches the configured botId
    // This supports Botpress Execute Code cards which can't compute HMAC signatures
    if (body.botId && configData.config.botId) {
      if (body.botId === configData.config.botId) {
        this.logger.warn(
          `No signature provided, allowing webhook based on botId match for tenant ${tenantId}`,
        );
        return true;
      }
      this.logger.warn(`botId mismatch: payload=${body.botId}, config=${configData.config.botId}`);
      return false;
    }

    // In non-production environments, allow unsigned requests with a warning
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      this.logger.warn('No signature provided, allowing in development mode');
      return true;
    }

    return false;
  }

  /**
   * Handle outgoing message from Botpress (bot response)
   */
  private async handleMessageEvent(
    tenantId: string,
    event: BotpressWebhookDto,
  ): Promise<void> {
    // Only process outgoing messages (bot responses)
    if (event.payload.direction !== 'outgoing') {
      return;
    }

    await this.messageService.sendBotResponse(tenantId, event.conversationId, {
      type: 'text',
      text: event.payload.text,
    });

    this.logger.debug(
      `Processed outgoing message for conversation ${event.conversationId}`,
    );
  }

  /**
   * Handle qualification complete event
   */
  private async handleQualificationComplete(
    tenantId: string,
    event: BotpressWebhookDto,
  ): Promise<void> {
    const result = await this.qualificationProcessor.processQualificationComplete(
      tenantId,
      event.conversationId,
      {
        name: event.payload.name,
        phone: event.payload.phone || '',
        email: event.payload.email,
        propertyType: event.payload.propertyType,
        budget: event.payload.budget,
        location: event.payload.location,
        timeline: event.payload.timeline,
        financingNeeded: event.payload.financingNeeded,
        seriousnessScore: event.payload.seriousnessScore || 0,
        collectedAt: event.payload.collectedAt || event.timestamp,
        projectId: event.payload.projectId,
        projectName: event.payload.projectName,
      },
    );

    this.logger.log(
      `Qualification processed for conversation ${event.conversationId}: ` +
        `lead=${result.leadId || 'none'}, deal=${result.dealId || 'none'}`,
    );
  }

  /**
   * Handle handoff request event
   */
  private async handleHandoffRequested(
    tenantId: string,
    event: BotpressWebhookDto,
  ): Promise<void> {
    await this.qualificationProcessor.processHandoffRequest(
      tenantId,
      event.conversationId,
      event.payload.reason || 'User requested human agent',
      event.payload.priority || 'normal',
      event.payload.stateData,
    );

    this.logger.log(`Handoff requested for conversation ${event.conversationId}`);
  }

  /**
   * Handle state changed event
   */
  private async handleStateChanged(
    tenantId: string,
    event: BotpressWebhookDto,
  ): Promise<void> {
    const mapping = await this.syncService.getByBotpressConvId(
      tenantId,
      event.conversationId,
    );

    if (mapping) {
      await this.syncService.updateState(mapping.id, event.payload.currentState || '');
    }

    this.logger.debug(
      `State changed for conversation ${event.conversationId}: ` +
        `${event.payload.previousState} -> ${event.payload.currentState}`,
    );
  }

  /**
   * Handle conversation ended event
   */
  private async handleConversationEnded(
    tenantId: string,
    event: BotpressWebhookDto,
  ): Promise<void> {
    const mapping = await this.syncService.getByBotpressConvId(
      tenantId,
      event.conversationId,
    );

    if (mapping) {
      await this.syncService.updateState(mapping.id, 'ended');

      // If there's qualification data, process it
      if (event.payload.seriousnessScore !== undefined) {
        await this.qualificationProcessor.processQualificationComplete(
          tenantId,
          event.conversationId,
          {
            phone: event.payload.phone || '',
            seriousnessScore: event.payload.seriousnessScore,
            collectedAt: event.timestamp,
            ...event.payload,
          },
        );
      }
    }

    this.logger.log(
      `Conversation ended: ${event.conversationId}, reason: ${event.payload.reason}`,
    );
  }
}
