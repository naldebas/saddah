// src/modules/integrations/whatsapp/whatsapp.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AiModule } from '../../ai/ai.module';
import { SettingsModule } from '../../settings/settings.module';

import { TwilioWhatsAppAdapter } from './adapters/twilio.adapter';
import { MetaWhatsAppAdapter } from './adapters/meta.adapter';
import { WhatsAppAdapterFactory, WhatsAppAdapterProvider } from './whatsapp.factory';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { WhatsAppTransformerService } from './whatsapp-transformer.service';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { WhatsAppMessageProcessor } from './whatsapp-message.processor';
import { WhatsAppBotService } from './whatsapp-bot.service';
import { WhatsAppStatusService } from './whatsapp-status.service';
import { WhatsAppStatusController } from './whatsapp-status.controller';
import { WhatsAppMediaService } from './whatsapp-media.service';
import { WhatsAppMediaController } from './whatsapp-media.controller';
import { WhatsAppContactSyncService } from './whatsapp-contact-sync.service';
import { WhatsAppQuotaService } from './whatsapp-quota.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppTemplateController } from './whatsapp-template.controller';
import { WHATSAPP_ADAPTER } from './interfaces/whatsapp-adapter.interface';

export const WHATSAPP_QUEUE = 'whatsapp-messages';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AiModule,
    SettingsModule,
    BullModule.registerQueue({
      name: WHATSAPP_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    WhatsAppWebhookController,
    WhatsAppStatusController,
    WhatsAppMediaController,
    WhatsAppTemplateController,
  ],
  providers: [
    // Adapters
    TwilioWhatsAppAdapter,
    MetaWhatsAppAdapter,

    // Factory
    WhatsAppAdapterFactory,

    // Dynamic adapter provider
    WhatsAppAdapterProvider,

    // Guards
    WebhookSignatureGuard,

    // Services
    WhatsAppTransformerService,
    WhatsAppSenderService,
    WhatsAppBotService,
    WhatsAppStatusService,
    WhatsAppMediaService,
    WhatsAppContactSyncService,
    WhatsAppQuotaService,
    WhatsAppTemplateService,

    // Queue Processor
    WhatsAppMessageProcessor,
  ],
  exports: [
    // Export for use in other modules
    WhatsAppAdapterFactory,
    WHATSAPP_ADAPTER,
    TwilioWhatsAppAdapter,
    MetaWhatsAppAdapter,
    WhatsAppWebhookController,
    WhatsAppTransformerService,
    WhatsAppSenderService,
    WhatsAppBotService,
    WhatsAppStatusService,
    WhatsAppMediaService,
    WhatsAppContactSyncService,
    WhatsAppQuotaService,
    WhatsAppTemplateService,
    BullModule,
  ],
})
export class WhatsAppModule {}
