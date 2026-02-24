// src/modules/integrations/whatsapp/whatsapp-transformer.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppTransformerService } from './whatsapp-transformer.service';
import { MessageType, MessageDirection, MessageSender } from '../../conversations/dto/send-message.dto';
import { ConversationChannel } from '../../conversations/dto/create-conversation.dto';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { MetaWebhookDto } from './dto/meta-webhook.dto';

describe('WhatsAppTransformerService', () => {
  let service: WhatsAppTransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppTransformerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                DEFAULT_COUNTRY_CODE: '966',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppTransformerService>(WhatsAppTransformerService);
  });

  describe('Phone Number Utilities', () => {
    describe('normalizePhoneNumber', () => {
      it('should normalize phone with + prefix', () => {
        expect(service.normalizePhoneNumber('+966501234567')).toBe('+966501234567');
      });

      it('should add + prefix if missing', () => {
        expect(service.normalizePhoneNumber('966501234567')).toBe('+966501234567');
      });

      it('should convert 00 prefix to +', () => {
        expect(service.normalizePhoneNumber('00966501234567')).toBe('+966501234567');
      });

      it('should add country code for local numbers starting with 0', () => {
        expect(service.normalizePhoneNumber('0501234567')).toBe('+966501234567');
      });

      it('should remove whatsapp: prefix', () => {
        expect(service.normalizePhoneNumber('whatsapp:+966501234567')).toBe('+966501234567');
      });

      it('should remove non-digit characters', () => {
        expect(service.normalizePhoneNumber('+966 50 123 4567')).toBe('+966501234567');
        expect(service.normalizePhoneNumber('+966-50-123-4567')).toBe('+966501234567');
      });
    });

    describe('formatPhoneForWhatsApp', () => {
      it('should remove + prefix', () => {
        expect(service.formatPhoneForWhatsApp('+966501234567')).toBe('966501234567');
      });
    });

    describe('extractTwilioPhone', () => {
      it('should extract phone from Twilio format', () => {
        expect(service.extractTwilioPhone('whatsapp:+966501234567')).toBe('+966501234567');
      });
    });
  });

  describe('Twilio Webhook Transformation', () => {
    it('should transform text message', () => {
      const payload: TwilioWebhookDto = {
        MessageSid: 'SM123456',
        AccountSid: 'AC123456',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+14155238886',
        Body: 'مرحباً',
        ProfileName: 'أحمد',
      };

      const result = service.transformTwilioWebhook(payload);

      expect(result).toBeDefined();
      expect(result!.channelId).toBe('+966501234567');
      expect(result!.channel).toBe(ConversationChannel.WHATSAPP);
      expect(result!.messageId).toBe('SM123456');
      expect(result!.type).toBe(MessageType.TEXT);
      expect(result!.content).toBe('مرحباً');
      expect(result!.direction).toBe(MessageDirection.INBOUND);
      expect(result!.sender).toBe(MessageSender.CONTACT);
      expect(result!.senderName).toBe('أحمد');
    });

    it('should transform image message', () => {
      const payload: TwilioWebhookDto = {
        MessageSid: 'SM123456',
        AccountSid: 'AC123456',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+14155238886',
        Body: 'صورة المنزل',
        NumMedia: '1',
        MediaUrl0: 'https://example.com/image.jpg',
        MediaContentType0: 'image/jpeg',
      };

      const result = service.transformTwilioWebhook(payload);

      expect(result).toBeDefined();
      expect(result!.type).toBe(MessageType.IMAGE);
      expect(result!.mediaUrl).toBe('https://example.com/image.jpg');
      expect(result!.mediaMimeType).toBe('image/jpeg');
    });

    it('should transform location message', () => {
      const payload: TwilioWebhookDto = {
        MessageSid: 'SM123456',
        AccountSid: 'AC123456',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+14155238886',
        Latitude: '24.7136',
        Longitude: '46.6753',
        Label: 'الرياض',
        Address: 'المملكة العربية السعودية',
      };

      const result = service.transformTwilioWebhook(payload);

      expect(result).toBeDefined();
      expect(result!.type).toBe(MessageType.LOCATION);
      expect(result!.location).toBeDefined();
      expect(result!.location!.latitude).toBe(24.7136);
      expect(result!.location!.longitude).toBe(46.6753);
      expect(result!.location!.name).toBe('الرياض');
    });

    it('should transform button reply', () => {
      const payload: TwilioWebhookDto = {
        MessageSid: 'SM123456',
        AccountSid: 'AC123456',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+14155238886',
        ButtonPayload: 'yes_interested',
        ButtonText: 'نعم، مهتم',
      };

      const result = service.transformTwilioWebhook(payload);

      expect(result).toBeDefined();
      expect(result!.buttonPayload).toBe('yes_interested');
      expect(result!.content).toBe('نعم، مهتم');
    });

    it('should return null for invalid payload', () => {
      const result = service.transformTwilioWebhook({} as TwilioWebhookDto);
      expect(result).toBeNull();
    });
  });

  describe('Meta Webhook Transformation', () => {
    it('should transform text message', () => {
      const payload: MetaWebhookDto = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '14155238886',
                    phone_number_id: '123456',
                  },
                  contacts: [
                    {
                      wa_id: '966501234567',
                      profile: { name: 'أحمد' },
                    },
                  ],
                  messages: [
                    {
                      from: '966501234567',
                      id: 'wamid.123456',
                      timestamp: '1699900000',
                      type: 'text',
                      text: { body: 'مرحباً' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const results = service.transformMetaWebhook(payload);

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.channelId).toBe('+966501234567');
      expect(result.channel).toBe(ConversationChannel.WHATSAPP);
      expect(result.messageId).toBe('wamid.123456');
      expect(result.type).toBe(MessageType.TEXT);
      expect(result.content).toBe('مرحباً');
      expect(result.senderName).toBe('أحمد');
    });

    it('should transform image message', () => {
      const payload: MetaWebhookDto = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '14155238886',
                    phone_number_id: '123456',
                  },
                  messages: [
                    {
                      from: '966501234567',
                      id: 'wamid.123456',
                      timestamp: '1699900000',
                      type: 'image',
                      image: {
                        id: 'media_123',
                        mime_type: 'image/jpeg',
                        caption: 'صورة الفيلا',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const results = service.transformMetaWebhook(payload);

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.type).toBe(MessageType.IMAGE);
      expect(result.mediaUrl).toBe('media_123');
      expect(result.content).toBe('صورة الفيلا');
    });

    it('should transform location message', () => {
      const payload: MetaWebhookDto = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '14155238886',
                    phone_number_id: '123456',
                  },
                  messages: [
                    {
                      from: '966501234567',
                      id: 'wamid.123456',
                      timestamp: '1699900000',
                      type: 'location',
                      location: {
                        latitude: 24.7136,
                        longitude: 46.6753,
                        name: 'الرياض',
                        address: 'المملكة العربية السعودية',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const results = service.transformMetaWebhook(payload);

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.type).toBe(MessageType.LOCATION);
      expect(result.location).toBeDefined();
      expect(result.location!.latitude).toBe(24.7136);
      expect(result.location!.longitude).toBe(46.6753);
    });

    it('should return empty array for empty payload', () => {
      const payload: MetaWebhookDto = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const results = service.transformMetaWebhook(payload);
      expect(results).toHaveLength(0);
    });
  });

  describe('Outbound Transformation', () => {
    it('should transform text message for outbound', () => {
      const result = service.transformOutboundMessage('+966501234567', {
        direction: MessageDirection.OUTBOUND,
        sender: MessageSender.BOT,
        type: MessageType.TEXT,
        content: 'مرحباً بك!',
      });

      expect(result.to).toBe('966501234567');
      expect(result.type).toBe('text');
      expect(result.content).toBe('مرحباً بك!');
    });

    it('should transform image message for outbound', () => {
      const result = service.transformOutboundMessage('+966501234567', {
        direction: MessageDirection.OUTBOUND,
        sender: MessageSender.BOT,
        type: MessageType.IMAGE,
        content: 'صورة العقار',
        mediaUrl: 'https://example.com/property.jpg',
      });

      expect(result.type).toBe('image');
      expect(result.mediaUrl).toBe('https://example.com/property.jpg');
      expect(result.caption).toBe('صورة العقار');
    });
  });

  describe('Status Transformation', () => {
    it('should transform Twilio status callback', () => {
      const result = service.transformTwilioStatus({
        MessageSid: 'SM123456',
        MessageStatus: 'delivered',
        To: 'whatsapp:+966501234567',
      });

      expect(result).toBeDefined();
      expect(result!.messageId).toBe('SM123456');
      expect(result!.status).toBe('delivered');
      expect(result!.recipientId).toBe('+966501234567');
    });

    it('should transform Twilio failed status', () => {
      const result = service.transformTwilioStatus({
        MessageSid: 'SM123456',
        MessageStatus: 'failed',
        To: 'whatsapp:+966501234567',
        ErrorCode: '30001',
        ErrorMessage: 'Message delivery failed',
      });

      expect(result).toBeDefined();
      expect(result!.status).toBe('failed');
      expect(result!.error).toBeDefined();
      expect(result!.error!.code).toBe('30001');
    });

    it('should transform Meta status update', () => {
      const result = service.transformMetaStatus({
        id: 'wamid.123456',
        status: 'read',
        timestamp: '1699900000',
        recipient_id: '966501234567',
      });

      expect(result).toBeDefined();
      expect(result!.messageId).toBe('wamid.123456');
      expect(result!.status).toBe('read');
      expect(result!.recipientId).toBe('966501234567');
    });
  });

  describe('DTO Creation', () => {
    it('should create conversation DTO from transformed message', () => {
      const message = service.transformTwilioWebhook({
        MessageSid: 'SM123456',
        AccountSid: 'AC123456',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+14155238886',
        Body: 'مرحباً',
      })!;

      const dto = service.createConversationDto(message);

      expect(dto.channel).toBe(ConversationChannel.WHATSAPP);
      expect(dto.channelId).toBe('+966501234567');
    });

    it('should create send message DTO from transformed message', () => {
      const message = service.transformTwilioWebhook({
        MessageSid: 'SM123456',
        AccountSid: 'AC123456',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+14155238886',
        Body: 'مرحباً',
      })!;

      const dto = service.createSendMessageDto(message);

      expect(dto.direction).toBe(MessageDirection.INBOUND);
      expect(dto.sender).toBe(MessageSender.CONTACT);
      expect(dto.type).toBe(MessageType.TEXT);
      expect(dto.content).toBe('مرحباً');
      expect(dto.externalId).toBe('SM123456');
    });
  });
});
