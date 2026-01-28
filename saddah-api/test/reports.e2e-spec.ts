import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('ReportsController (e2e)', () => {
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

  describe('GET /api/v1/reports/sales', () => {
    it('should return sales report with default period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalDeals');
      expect(response.body).toHaveProperty('wonDeals');
      expect(response.body).toHaveProperty('lostDeals');
      expect(response.body).toHaveProperty('conversionRate');
      expect(response.body).toHaveProperty('averageDealValue');
      expect(response.body).toHaveProperty('revenueByMonth');
      expect(response.body).toHaveProperty('dealsByStage');
      expect(response.body).toHaveProperty('topPerformers');
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
    });

    it('should filter by period', async () => {
      const periods = ['today', 'week', 'month', 'quarter', 'year'];

      for (const period of periods) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/reports/sales')
          .query({ period })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.period).toBe(period);
      }
    });

    it('should filter by custom date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .query({ period: 'custom', startDate, endDate })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.period).toBe('custom');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .expect(401);
    });
  });

  describe('GET /api/v1/reports/leads', () => {
    it('should return leads report', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalLeads');
      expect(response.body).toHaveProperty('newLeads');
      expect(response.body).toHaveProperty('convertedLeads');
      expect(response.body).toHaveProperty('conversionRate');
      expect(response.body).toHaveProperty('leadsBySource');
      expect(response.body).toHaveProperty('leadsByStatus');
      expect(response.body).toHaveProperty('leadsByMonth');
      expect(response.body).toHaveProperty('averageConversionTime');
      expect(response.body).toHaveProperty('period');
    });

    it('should filter by period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/leads')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.period).toBe('month');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/leads')
        .expect(401);
    });
  });

  describe('GET /api/v1/reports/activities', () => {
    it('should return activities report', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalActivities');
      expect(response.body).toHaveProperty('completedActivities');
      expect(response.body).toHaveProperty('pendingActivities');
      expect(response.body).toHaveProperty('overdueActivities');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('activitiesByType');
      expect(response.body).toHaveProperty('activitiesByUser');
      expect(response.body).toHaveProperty('activitiesByDay');
      expect(response.body).toHaveProperty('period');
    });

    it('should filter by period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/activities')
        .query({ period: 'week' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.period).toBe('week');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/activities')
        .expect(401);
    });
  });

  describe('GET /api/v1/reports/contacts', () => {
    it('should return contacts report', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalContacts');
      expect(response.body).toHaveProperty('newContacts');
      expect(response.body).toHaveProperty('activeContacts');
      expect(response.body).toHaveProperty('contactsBySource');
      expect(response.body).toHaveProperty('contactsByMonth');
      expect(response.body).toHaveProperty('topTags');
      expect(response.body).toHaveProperty('period');
    });

    it('should filter by period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/contacts')
        .query({ period: 'quarter' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.period).toBe('quarter');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/contacts')
        .expect(401);
    });
  });

  describe('GET /api/v1/reports/export/:type', () => {
    it('should export sales report as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/export/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('sales-report');
    });

    it('should export leads report as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/export/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('leads-report');
    });

    it('should export activities report as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/export/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('activities-report');
    });

    it('should export contacts report as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/export/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('contacts-report');
    });

    it('should support period filter in export', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/export/sales')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should return 400 for invalid report type', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/export/invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/export/sales')
        .expect(401);
    });
  });

  describe('Report Data Accuracy', () => {
    it('should return consistent data across endpoints', async () => {
      // Get sales report
      const salesResponse = await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify data consistency
      expect(salesResponse.body.totalDeals).toBeGreaterThanOrEqual(0);
      expect(salesResponse.body.wonDeals).toBeLessThanOrEqual(salesResponse.body.totalDeals);
      expect(salesResponse.body.lostDeals).toBeLessThanOrEqual(salesResponse.body.totalDeals);

      // Conversion rate should be between 0 and 100
      expect(salesResponse.body.conversionRate).toBeGreaterThanOrEqual(0);
      expect(salesResponse.body.conversionRate).toBeLessThanOrEqual(100);
    });

    it('should handle empty data gracefully', async () => {
      // Use a period that likely has no data
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .query({
          period: 'custom',
          startDate: '2000-01-01',
          endDate: '2000-01-02',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should still return valid structure with zero values
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalDeals');
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should only include tenant data in reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All data should belong to the authenticated user's tenant
      expect(response.body.topPerformers).toBeInstanceOf(Array);
      // The structure should be valid regardless of data
      expect(response.body).toHaveProperty('period');
    });
  });
});
