import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('SettingsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const testCredentials = {
    email: 'admin@saddah.io',
    password: 'Admin@123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(testCredentials);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/settings/tenant', () => {
    it('should return tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('companyName');
      expect(response.body).toHaveProperty('companyLogo');
      expect(response.body).toHaveProperty('primaryColor');
      expect(response.body).toHaveProperty('timezone');
      expect(response.body).toHaveProperty('dateFormat');
      expect(response.body).toHaveProperty('currency');
      expect(response.body).toHaveProperty('businessHours');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/settings/tenant')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/settings/tenant', () => {
    it('should update tenant settings', async () => {
      const updateData = {
        companyName: 'شركة صدى العقارية المحدثة',
        primaryColor: '#3B82F6',
        timezone: 'Asia/Riyadh',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/settings/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.companyName).toBe(updateData.companyName);
      expect(response.body.primaryColor).toBe(updateData.primaryColor);
      expect(response.body.timezone).toBe(updateData.timezone);
    });

    it('should update business hours', async () => {
      const updateData = {
        businessHours: {
          start: '08:00',
          end: '18:00',
          days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        },
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/settings/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.businessHours).toEqual(updateData.businessHours);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/settings/tenant')
        .send({ companyName: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/settings/notifications', () => {
    it('should return notification preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('emailNotifications');
      expect(response.body).toHaveProperty('pushNotifications');
      expect(response.body).toHaveProperty('smsNotifications');
      expect(response.body).toHaveProperty('newLeadNotification');
      expect(response.body).toHaveProperty('dealUpdateNotification');
      expect(response.body).toHaveProperty('taskReminderNotification');
      expect(response.body).toHaveProperty('dailyDigest');
      expect(response.body).toHaveProperty('weeklyReport');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/settings/notifications')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/settings/notifications', () => {
    it('should update notification preferences', async () => {
      const updateData = {
        emailNotifications: true,
        pushNotifications: false,
        newLeadNotification: true,
        dailyDigest: false,
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/settings/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.emailNotifications).toBe(updateData.emailNotifications);
      expect(response.body.pushNotifications).toBe(updateData.pushNotifications);
      expect(response.body.newLeadNotification).toBe(updateData.newLeadNotification);
      expect(response.body.dailyDigest).toBe(updateData.dailyDigest);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/settings/notifications')
        .send({ emailNotifications: false })
        .expect(401);
    });
  });

  describe('GET /api/v1/settings/preferences', () => {
    it('should return user preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('theme');
      expect(response.body).toHaveProperty('language');
      expect(response.body).toHaveProperty('defaultView');
      expect(response.body).toHaveProperty('itemsPerPage');
      expect(response.body).toHaveProperty('compactMode');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/settings/preferences')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/settings/preferences', () => {
    it('should update user preferences', async () => {
      const updateData = {
        theme: 'dark',
        language: 'ar',
        defaultView: 'kanban',
        itemsPerPage: 25,
        compactMode: true,
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/settings/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.theme).toBe(updateData.theme);
      expect(response.body.language).toBe(updateData.language);
      expect(response.body.defaultView).toBe(updateData.defaultView);
      expect(response.body.itemsPerPage).toBe(updateData.itemsPerPage);
      expect(response.body.compactMode).toBe(updateData.compactMode);
    });

    it('should validate theme values', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/settings/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'invalid_theme' })
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/settings/preferences')
        .send({ theme: 'light' })
        .expect(401);
    });
  });

  describe('GET /api/v1/settings/plan', () => {
    it('should return plan information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('planName');
      expect(response.body).toHaveProperty('planType');
      expect(response.body).toHaveProperty('maxUsers');
      expect(response.body).toHaveProperty('currentUsers');
      expect(response.body).toHaveProperty('maxContacts');
      expect(response.body).toHaveProperty('currentContacts');
      expect(response.body).toHaveProperty('maxDeals');
      expect(response.body).toHaveProperty('currentDeals');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('billingCycle');
      expect(response.body).toHaveProperty('nextBillingDate');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/settings/plan')
        .expect(401);
    });
  });
});
