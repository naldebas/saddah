// src/modules/integrations/botpress/botpress.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { LeadsModule } from '@/modules/leads/leads.module';
import { ProductsModule } from '@/modules/products/products.module';

// Controllers
import { BotpressController, BotpressConversationsController } from './botpress.controller';
import { BotpressWebhookController } from './botpress-webhook.controller';

// Services
import { BotpressConfigService } from './botpress-config.service';
import { BotpressClientService } from './botpress-client.service';
import { BotpressMessageService } from './botpress-message.service';
import { BotpressSyncService } from './botpress-sync.service';
import { BotpressQualificationProcessor } from './botpress-qualification.processor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => LeadsModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [
    BotpressController,
    BotpressConversationsController,
    BotpressWebhookController,
  ],
  providers: [
    BotpressConfigService,
    BotpressClientService,
    BotpressMessageService,
    BotpressSyncService,
    BotpressQualificationProcessor,
  ],
  exports: [
    BotpressConfigService,
    BotpressClientService,
    BotpressMessageService,
    BotpressSyncService,
    BotpressQualificationProcessor,
  ],
})
export class BotpressModule {}
