import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CompaniesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let companyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@saddah.io',
        password: 'Admin@123',
      });

    accessToken = loginResponse.body.accessToken;
    tenantId = loginResponse.body.user.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/companies (POST)', () => {
    it('should create a new company', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'شركة الاختبار العقارية',
          nameEn: 'Test Real Estate Company',
          type: 'developer',
          industry: 'real_estate',
          email: 'test@company.com',
          phone: '+966501234567',
          website: 'https://test-company.com',
          address: 'الرياض، حي العليا',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('شركة الاختبار العقارية');
      expect(response.body.type).toBe('developer');
      companyId = response.body.id;
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'incomplete@company.com',
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({
          name: 'Unauthorized Company',
          type: 'agency',
        })
        .expect(401);
    });
  });

  describe('/api/v1/companies (GET)', () => {
    it('should return paginated companies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should filter companies by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/companies?type=developer')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((c: { type: string }) => c.type === 'developer')).toBe(true);
    });

    it('should search companies by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/companies?search=الاختبار')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/companies?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
    });
  });

  describe('/api/v1/companies/:id (GET)', () => {
    it('should return a single company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(companyId);
      expect(response.body.name).toBe('شركة الاختبار العقارية');
    });

    it('should return 404 for non-existent company', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/companies/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/companies/:id (PATCH)', () => {
    it('should update a company', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'شركة الاختبار العقارية المحدثة',
          phone: '+966509876543',
        })
        .expect(200);

      expect(response.body.name).toBe('شركة الاختبار العقارية المحدثة');
      expect(response.body.phone).toBe('+966509876543');
    });

    it('should return 404 for non-existent company', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/companies/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('/api/v1/companies/:id/contacts (GET)', () => {
    it('should return contacts linked to the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/contacts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/v1/companies/:id (DELETE)', () => {
    it('should delete a company', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for already deleted company', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
