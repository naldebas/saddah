// src/modules/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { WhatsAppConfigController } from './whatsapp-config.controller';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SettingsController, WhatsAppConfigController],
  providers: [SettingsService, WhatsAppConfigService],
  exports: [SettingsService, WhatsAppConfigService],
})
export class SettingsModule {}
