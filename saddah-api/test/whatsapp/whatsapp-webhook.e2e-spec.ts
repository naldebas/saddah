// test/whatsapp/whatsapp-webhook.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { WhatsAppModule } from '../../src/modules/integrations/whatsapp/whatsapp.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AiModule } from '../../src/modules/ai/ai.module';
import { SettingsModule } from '../../src/modules/settings/settings.module';
import { WHATSAPP_ADAPTER } from '../../src/modules/integrations/whatsapp/interfaces/whatsapp-adapter.interface';

describe('WhatsApp Webhook E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAdapter: any;

  const TWILIO_AUTH_TOKEN = 'test-auth-token';
  const META_APP_SECRET = 'test-meta-secret';
  const META_VERIFY_TOKEN = 'test-verify-token';

  beforeAll(async () => {
    mockAdapter = {
      sendTextMessage: jest.fn().mockResolvedValue({ success: true, externalId: 'SM123' }),
      sendTemplateMessage: jest.fn().mockResolvedValue({ success: true }),
      sendMediaMessage: jest.fn().mockResolvedValue({ success: true }),
      sendLocationMessage: jest.fn().mockResolvedValue({ success: true }),
      isConfigured: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('mock'),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        WhatsAppModule,
        PrismaModule,
        AiModule,
        SettingsModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            TWILIO_AUTH_TOKEN,
            META_APP_SECRET,
            META_VERIFY_TOKEN,
            DEFAULT_TENANT_ID: 'test-tenant',
            'whatsapp.botEnabled': false,
          };
          return config[key] ?? defaultValue;
        }),
      })
      .overrideProvider(WHATSAPP_ADAPTER)
      .useValue(mockAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // META WEBHOOK VERIFICATION
  // ==========================================

  describe('GET /api/v1/whatsapp/webhook (Meta Verification)', () => {
    it('should verify webhook with correct token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': META_VERIFY_TOKEN,
          'hub.challenge': '1234567890',
        })
        .expect(200)
        .expect('1234567890');
    });

    it('should reject webhook with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': '1234567890',
        })
        .expect(403);
    });

    it('should reject webhook with missing parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
        })
        .expect(403);
    });
  });

  // ==========================================
  // META WEBHOOK MESSAGE PROCESSING
  // ==========================================

  describe('POST /api/v1/whatsapp/webhook (Meta Messages)', () => {
    const createMetaPayload = (messages: any[]) => ({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '966509999999',
                  phone_number_id: 'phone-123',
                },
                contacts: [
                  {
                    wa_id: '966501234567',
                    profile: { name: 'Test User' },
                  },
                ],
                messages,
              },
              field: 'messages',
            },
          ],
        },
      ],
    });

    const generateMetaSignature = (payload: string): string => {
      const hmac = crypto.createHmac('sha256', META_APP_SECRET);
      hmac.update(payload);
      return 'sha256=' + hmac.digest('hex');
    };

    it('should process valid text message', async () => {
      const payload = createMetaPayload([
        {
          from: '966501234567',
          id: 'wamid.12345',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: { body: 'مرحبا' },
        },
      ]);

      const payloadString = JSON.stringify(payload);
      const signature = generateMetaSignature(payloadString);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200)
        .expect({ status: 'ok' });
    });

    it('should process image message', async () => {
      const payload = createMetaPayload([
        {
          from: '966501234567',
          id: 'wamid.12346',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'image',
          image: {
            id: 'media-123',
            mime_type: 'image/jpeg',
            caption: 'صورة العقار',
          },
        },
      ]);

      const payloadString = JSON.stringify(payload);
      const signature = generateMetaSignature(payloadString);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should process location message', async () => {
      const payload = createMetaPayload([
        {
          from: '966501234567',
          id: 'wamid.12347',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'location',
          location: {
            latitude: 24.7136,
            longitude: 46.6753,
            name: 'الرياض',
          },
        },
      ]);

      const payloadString = JSON.stringify(payload);
      const signature = generateMetaSignature(payloadString);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should reject message with invalid signature', async () => {
      const payload = createMetaPayload([
        {
          from: '966501234567',
          id: 'wamid.12345',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: { body: 'مرحبا' },
        },
      ]);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', 'sha256=invalid')
        .send(payload)
        .expect(403);
    });

    it('should reject message without signature', async () => {
      const payload = createMetaPayload([
        {
          from: '966501234567',
          id: 'wamid.12345',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: { body: 'مرحبا' },
        },
      ]);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send(payload)
        .expect(403);
    });
  });

  // ==========================================
  // META STATUS WEBHOOKS
  // ==========================================

  describe('POST /api/v1/whatsapp/webhook (Meta Status)', () => {
    const createStatusPayload = (statuses: any[]) => ({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '966509999999',
                  phone_number_id: 'phone-123',
                },
                statuses,
              },
              field: 'messages',
            },
          ],
        },
      ],
    });

    const generateMetaSignature = (payload: string): string => {
      const hmac = crypto.createHmac('sha256', META_APP_SECRET);
      hmac.update(payload);
      return 'sha256=' + hmac.digest('hex');
    };

    it('should process delivered status', async () => {
      const payload = createStatusPayload([
        {
          id: 'wamid.12345',
          status: 'delivered',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          recipient_id: '966501234567',
        },
      ]);

      const payloadString = JSON.stringify(payload);
      const signature = generateMetaSignature(payloadString);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should process read status', async () => {
      const payload = createStatusPayload([
        {
          id: 'wamid.12345',
          status: 'read',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          recipient_id: '966501234567',
        },
      ]);

      const payloadString = JSON.stringify(payload);
      const signature = generateMetaSignature(payloadString);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should process failed status with error', async () => {
      const payload = createStatusPayload([
        {
          id: 'wamid.12345',
          status: 'failed',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          recipient_id: '966501234567',
          errors: [
            {
              code: 131047,
              title: 'Re-engagement message',
              message: 'More than 24 hours have passed',
            },
          ],
        },
      ]);

      const payloadString = JSON.stringify(payload);
      const signature = generateMetaSignature(payloadString);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });
  });

  // ==========================================
  // TWILIO WEBHOOK MESSAGE PROCESSING
  // ==========================================

  describe('POST /api/v1/whatsapp/webhook/twilio (Twilio Messages)', () => {
    const generateTwilioSignature = (
      url: string,
      params: Record<string, string>,
    ): string => {
      const data =
        url +
        Object.keys(params)
          .sort()
          .map((key) => key + params[key])
          .join('');

      return crypto
        .createHmac('sha1', TWILIO_AUTH_TOKEN)
        .update(data, 'utf8')
        .digest('base64');
    };

    it('should process valid Twilio text message', async () => {
      const params = {
        MessageSid: 'SM12345',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+966509999999',
        Body: 'مرحبا',
        ProfileName: 'أحمد',
        NumMedia: '0',
      };

      const url = 'http://localhost/api/v1/whatsapp/webhook/twilio';
      const signature = generateTwilioSignature(url, params);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio')
        .set('X-Twilio-Signature', signature)
        .type('form')
        .send(params)
        .expect(200);
    });

    it('should process Twilio image message', async () => {
      const params = {
        MessageSid: 'SM12346',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+966509999999',
        Body: '',
        NumMedia: '1',
        MediaUrl0: 'https://api.twilio.com/media/image.jpg',
        MediaContentType0: 'image/jpeg',
      };

      const url = 'http://localhost/api/v1/whatsapp/webhook/twilio';
      const signature = generateTwilioSignature(url, params);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio')
        .set('X-Twilio-Signature', signature)
        .type('form')
        .send(params)
        .expect(200);
    });

    it('should process Twilio location message', async () => {
      const params = {
        MessageSid: 'SM12347',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+966509999999',
        Body: '',
        Latitude: '24.7136',
        Longitude: '46.6753',
        Label: 'الرياض',
      };

      const url = 'http://localhost/api/v1/whatsapp/webhook/twilio';
      const signature = generateTwilioSignature(url, params);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio')
        .set('X-Twilio-Signature', signature)
        .type('form')
        .send(params)
        .expect(200);
    });

    it('should reject invalid Twilio signature', async () => {
      const params = {
        MessageSid: 'SM12345',
        From: 'whatsapp:+966501234567',
        To: 'whatsapp:+966509999999',
        Body: 'مرحبا',
      };

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio')
        .set('X-Twilio-Signature', 'invalid-signature')
        .type('form')
        .send(params)
        .expect(403);
    });
  });

  // ==========================================
  // TWILIO STATUS CALLBACKS
  // ==========================================

  describe('POST /api/v1/whatsapp/webhook/twilio/status (Twilio Status)', () => {
    const generateTwilioSignature = (
      url: string,
      params: Record<string, string>,
    ): string => {
      const data =
        url +
        Object.keys(params)
          .sort()
          .map((key) => key + params[key])
          .join('');

      return crypto
        .createHmac('sha1', TWILIO_AUTH_TOKEN)
        .update(data, 'utf8')
        .digest('base64');
    };

    it('should process delivered status callback', async () => {
      const params = {
        MessageSid: 'SM12345',
        MessageStatus: 'delivered',
        To: 'whatsapp:+966501234567',
      };

      const url = 'http://localhost/api/v1/whatsapp/webhook/twilio/status';
      const signature = generateTwilioSignature(url, params);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio/status')
        .set('X-Twilio-Signature', signature)
        .type('form')
        .send(params)
        .expect(200);
    });

    it('should process read status callback', async () => {
      const params = {
        MessageSid: 'SM12345',
        MessageStatus: 'read',
        To: 'whatsapp:+966501234567',
      };

      const url = 'http://localhost/api/v1/whatsapp/webhook/twilio/status';
      const signature = generateTwilioSignature(url, params);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio/status')
        .set('X-Twilio-Signature', signature)
        .type('form')
        .send(params)
        .expect(200);
    });

    it('should process failed status with error', async () => {
      const params = {
        MessageSid: 'SM12345',
        MessageStatus: 'failed',
        To: 'whatsapp:+966501234567',
        ErrorCode: '63007',
        ErrorMessage: 'Message not delivered',
      };

      const url = 'http://localhost/api/v1/whatsapp/webhook/twilio/status';
      const signature = generateTwilioSignature(url, params);

      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook/twilio/status')
        .set('X-Twilio-Signature', signature)
        .type('form')
        .send(params)
        .expect(200);
    });
  });

  // ==========================================
  // ERROR SCENARIOS
  // ==========================================

  describe('Error Scenarios', () => {
    it('should handle empty payload', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(403); // No signature
    });
  });
});
