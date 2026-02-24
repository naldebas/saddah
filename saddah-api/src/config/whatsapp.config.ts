// src/config/whatsapp.config.ts
import { registerAs } from '@nestjs/config';

export type WhatsAppProvider = 'twilio' | 'meta';

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  webhookVerifyToken: string;
  botEnabled: boolean;
  botGreeting: string;
  humanHandoffKeywords: string[];
  maxBotRetries: number;
  twilio: {
    accountSid: string;
    authToken: string;
    whatsappNumber: string;
  };
  meta: {
    token: string;
    phoneNumberId: string;
    businessAccountId: string;
    appSecret: string;
  };
}

export default registerAs(
  'whatsapp',
  (): WhatsAppConfig => ({
    provider: (process.env.WHATSAPP_PROVIDER as WhatsAppProvider) || 'twilio',
    webhookVerifyToken:
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'default-verify-token',
    botEnabled: process.env.WHATSAPP_BOT_ENABLED === 'true',
    botGreeting:
      process.env.WHATSAPP_BOT_GREETING ||
      'مرحباً! كيف يمكنني مساعدتك اليوم؟',
    humanHandoffKeywords: (
      process.env.WHATSAPP_HUMAN_HANDOFF_KEYWORDS ||
      'مساعدة,موظف,بشري,help,agent'
    ).split(','),
    maxBotRetries: parseInt(process.env.WHATSAPP_MAX_BOT_RETRIES || '3', 10),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
    },
    meta: {
      token: process.env.META_WHATSAPP_TOKEN || '',
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
    },
  }),
);
