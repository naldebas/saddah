// src/modules/integrations/whatsapp/whatsapp.factory.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppAdapter, WHATSAPP_ADAPTER } from './interfaces/whatsapp-adapter.interface';
import { TwilioWhatsAppAdapter } from './adapters/twilio.adapter';
import { MetaWhatsAppAdapter } from './adapters/meta.adapter';
import { WhatsAppProvider } from '../../../config/whatsapp.config';

@Injectable()
export class WhatsAppAdapterFactory {
  private readonly logger = new Logger(WhatsAppAdapterFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioAdapter: TwilioWhatsAppAdapter,
    private readonly metaAdapter: MetaWhatsAppAdapter,
  ) {}

  /**
   * Get the configured WhatsApp adapter based on environment settings
   */
  getAdapter(): WhatsAppAdapter {
    const provider = this.configService.get<WhatsAppProvider>('whatsapp.provider', 'twilio');

    switch (provider) {
      case 'meta':
        this.logger.debug('Using Meta WhatsApp adapter');
        return this.metaAdapter;

      case 'twilio':
      default:
        this.logger.debug('Using Twilio WhatsApp adapter');
        return this.twilioAdapter;
    }
  }

  /**
   * Get a specific adapter by provider name
   */
  getAdapterByProvider(provider: WhatsAppProvider): WhatsAppAdapter {
    switch (provider) {
      case 'meta':
        return this.metaAdapter;
      case 'twilio':
      default:
        return this.twilioAdapter;
    }
  }

  /**
   * Check if any adapter is properly configured
   */
  isAnyAdapterConfigured(): boolean {
    return this.twilioAdapter.isConfigured() || this.metaAdapter.isConfigured();
  }

  /**
   * Get the currently active provider name
   */
  getActiveProvider(): WhatsAppProvider {
    return this.configService.get<WhatsAppProvider>('whatsapp.provider', 'twilio');
  }
}

/**
 * Factory provider for dynamic adapter injection
 */
export const WhatsAppAdapterProvider = {
  provide: WHATSAPP_ADAPTER,
  useFactory: (factory: WhatsAppAdapterFactory) => factory.getAdapter(),
  inject: [WhatsAppAdapterFactory],
};
