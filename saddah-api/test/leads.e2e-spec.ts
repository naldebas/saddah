import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('LeadsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let createdLeadId: string;

  // Test credentials from seed data
  const testCredentials = {
    email: 'admin@saddah.io',
    password: 'Admin@123',
  };

  const validLead = {
    firstName: 'أحمد',
    lastName: 'الشهري',
    email: 'test.lead@example.com',
    phone: '+966501234567',
    whatsapp: '+966501234567',
    source: 'manual',
    propertyType: 'apartment',
    budget: 500000,
    timeline: '3_months',
    location: 'شمال الرياض',
    financingNeeded: true,
    notes: 'عميل مهتم بشقة في الرياض',
    tags: ['مهم', 'شقق'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(testCredentials);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up created lead if exists
    if (createdLeadId) {
      try {
        await prisma.lead.delete({
          where: { id: createdLeadId },
        });
      } catch (error) {
        // Lead might already be deleted
      }
    }
    await app.close();
  });

  describe('/leads (POST)', () => {
    it('should create a new lead', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validLead)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('firstName', validLead.firstName);
      expect(response.body).toHaveProperty('lastName', validLead.lastName);
      expect(response.body).toHaveProperty('email', validLead.email);
      expect(response.body).toHaveProperty('phone', validLead.phone);
      expect(response.body).toHaveProperty('source', validLead.source);
      expect(response.body).toHaveProperty('propertyType', validLead.propertyType);
      expect(response.body).toHaveProperty('budget', validLead.budget);
      expect(response.body).toHaveProperty('status', 'new');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('owner');

      createdLeadId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/leads')
        .send(validLead)
        .expect(401);
    });

    it('should handle optional fields correctly', async () => {
      const minimalLead = {
        firstName: 'خالد',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(minimalLead)
        .expect(201);

      expect(response.body).toHaveProperty('firstName', minimalLead.firstName);
      expect(response.body.lastName).toBeNull();
      expect(response.body.email).toBeNull();
      expect(response.body).toHaveProperty('source', 'manual');
      expect(response.body).toHaveProperty('status', 'new');

      // Clean up
      await prisma.lead.delete({
        where: { id: response.body.id },
      });
    });
  });

  describe('/leads (GET)', () => {
    it('should return paginated leads', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support search parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .query({ search: validLead.firstName })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should support status filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .query({ status: 'new' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // All returned leads should have status 'new'
      response.body.data.forEach((lead: any) => {
        expect(lead.status).toBe('new');
      });
    });

    it('should support source filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .query({ source: 'manual' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((lead: any) => {
        expect(lead.source).toBe('manual');
      });
    });

    it('should support score range filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads')
        .query({ minScore: 0, maxScore: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/leads')
        .expect(401);
    });
  });

  describe('/leads/statistics (GET)', () => {
    it('should return lead statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leads/statistics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body.byStatus).toHaveProperty('new');
      expect(response.body.byStatus).toHaveProperty('qualified');
      expect(response.body.byStatus).toHaveProperty('converted');
      expect(response.body).toHaveProperty('bySource');
      expect(Array.isArray(response.body.bySource)).toBe(true);
      expect(response.body).toHaveProperty('byPropertyType');
      expect(Array.isArray(response.body.byPropertyType)).toBe(true);
      expect(response.body).toHaveProperty('averageScore');
      expect(response.body).toHaveProperty('conversionRate');
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.averageScore).toBe('number');
      expect(typeof response.body.conversionRate).toBe('number');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/leads/statistics')
        .expect(401);
    });
  });

  describe('/leads/:id (GET)', () => {
    it('should return a single lead', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdLeadId);
      expect(response.body).toHaveProperty('firstName', validLead.firstName);
      expect(response.body).toHaveProperty('lastName', validLead.lastName);
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/leads/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/leads/${createdLeadId}`)
        .expect(401);
    });
  });

  describe('/leads/:id (PATCH)', () => {
    it('should update a lead', async () => {
      const updateData = {
        firstName: 'أحمد المعدل',
        budget: 600000,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', updateData.firstName);
      expect(response.body).toHaveProperty('budget', updateData.budget);
      // Other fields should remain unchanged
      expect(response.body).toHaveProperty('lastName', validLead.lastName);
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/leads/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Test' })
        .expect(404);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/leads/${createdLeadId}`)
        .send({ firstName: 'Test' })
        .expect(401);
    });
  });

  describe('/leads/:id/status/:status (PATCH)', () => {
    it('should update lead status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/leads/${createdLeadId}/status/contacted`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'contacted');
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/leads/non-existent-id/status/contacted')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/leads/:id/score (POST)', () => {
    it('should score a lead', async () => {
      const scoreData = {
        score: 75,
        grade: 'B',
        factors: {
          budget: 25,
          timeline: 25,
          engagement: 25,
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/leads/${createdLeadId}/score`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(scoreData)
        .expect(200);

      expect(response.body).toHaveProperty('score', scoreData.score);
      expect(response.body).toHaveProperty('scoreGrade', scoreData.grade);
    });

    it('should return 400 for missing score data', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/leads/${createdLeadId}/score`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('/leads/:id (DELETE)', () => {
    let tempLeadId: string;

    beforeAll(async () => {
      // Create a temporary lead for delete tests
      const response = await request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'مؤقت',
          lastName: 'للحذف',
        });

      tempLeadId = response.body.id;
    });

    it('should delete a lead', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/leads/${tempLeadId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify it's no longer accessible
      await request(app.getHttpServer())
        .get(`/api/v1/leads/${tempLeadId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/leads/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/leads/${createdLeadId}`)
        .expect(401);
    });
  });

  describe('Lead Conversion', () => {
    let leadToConvertId: string;

    beforeAll(async () => {
      // Create a lead specifically for conversion test
      const response = await request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'تحويل',
          lastName: 'اختبار',
          email: 'conversion.test@example.com',
          phone: '+966509999999',
        });

      leadToConvertId = response.body.id;
    });

    afterAll(async () => {
      // Clean up - the lead might be converted so we need to clean up contact too
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadToConvertId },
        });
        if (lead?.convertedToContactId) {
          await prisma.contact.delete({
            where: { id: lead.convertedToContactId },
          });
        }
        await prisma.lead.delete({
          where: { id: leadToConvertId },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should convert a lead to contact', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/leads/${leadToConvertId}/convert`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('lead');
      expect(response.body).toHaveProperty('contact');
      expect(response.body.lead.status).toBe('converted');
      expect(response.body.contact).toHaveProperty('id');
      expect(response.body.contact.firstName).toBe('تحويل');
    });

    it('should not allow converting an already converted lead', async () => {
      // Try to convert again - should fail
      await request(app.getHttpServer())
        .post(`/api/v1/leads/${leadToConvertId}/convert`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });
});
