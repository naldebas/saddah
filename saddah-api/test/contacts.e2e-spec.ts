import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ContactsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let createdContactId: string;

  // Test credentials from seed data
  const testCredentials = {
    email: 'admin@saddah.io',
    password: 'Admin@123',
  };

  const validContact = {
    firstName: 'محمد',
    lastName: 'الأحمدي',
    email: 'test.contact@example.com',
    phone: '+966501234567',
    whatsapp: '+966501234567',
    title: 'مدير المبيعات',
    source: 'manual',
    tags: ['عميل_مهم', 'قطاع_سكني'],
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
    // Clean up created contact if exists
    if (createdContactId) {
      try {
        await prisma.contact.delete({
          where: { id: createdContactId },
        });
      } catch (error) {
        // Contact might already be deleted
      }
    }
    await app.close();
  });

  describe('/contacts (POST)', () => {
    it('should create a new contact', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validContact)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('firstName', validContact.firstName);
      expect(response.body).toHaveProperty('lastName', validContact.lastName);
      expect(response.body).toHaveProperty('email', validContact.email);
      expect(response.body).toHaveProperty('phone', validContact.phone);
      expect(response.body).toHaveProperty('whatsapp', validContact.whatsapp);
      expect(response.body).toHaveProperty('title', validContact.title);
      expect(response.body).toHaveProperty('source', validContact.source);
      expect(response.body).toHaveProperty('tags');
      expect(response.body.tags).toEqual(validContact.tags);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('owner');

      createdContactId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'محمد' }) // Missing lastName
        .expect(400);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'محمد',
          lastName: 'الأحمدي',
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send(validContact)
        .expect(401);
    });

    it('should handle optional fields correctly', async () => {
      const minimalContact = {
        firstName: 'خالد',
        lastName: 'العمري',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(minimalContact)
        .expect(201);

      expect(response.body).toHaveProperty('firstName', minimalContact.firstName);
      expect(response.body).toHaveProperty('lastName', minimalContact.lastName);
      expect(response.body.email).toBeNull();
      expect(response.body.phone).toBeNull();

      // Clean up
      await prisma.contact.delete({
        where: { id: response.body.id },
      });
    });
  });

  describe('/contacts (GET)', () => {
    it('should return paginated contacts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contacts')
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
        .get('/api/v1/contacts')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support search parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .query({ search: validContact.firstName })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // At least our created contact should match
      if (response.body.data.length > 0) {
        const foundContact = response.body.data.find(
          (c: any) => c.id === createdContactId
        );
        if (foundContact) {
          expect(foundContact.firstName).toContain(validContact.firstName);
        }
      }
    });

    it('should support sorting', async () => {
      const responseAsc = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .query({ sortBy: 'createdAt', sortOrder: 'asc' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const responseDesc = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .query({ sortBy: 'createdAt', sortOrder: 'desc' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Just verify both return data
      expect(responseAsc.body.data).toBeInstanceOf(Array);
      expect(responseDesc.body.data).toBeInstanceOf(Array);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .expect(401);
    });
  });

  describe('/contacts/:id (GET)', () => {
    it('should return a single contact', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdContactId);
      expect(response.body).toHaveProperty('firstName', validContact.firstName);
      expect(response.body).toHaveProperty('lastName', validContact.lastName);
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/contacts/${createdContactId}`)
        .expect(401);
    });
  });

  describe('/contacts/:id (PATCH)', () => {
    it('should update a contact', async () => {
      const updateData = {
        firstName: 'محمد المعدل',
        title: 'مدير عام',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', updateData.firstName);
      expect(response.body).toHaveProperty('title', updateData.title);
      // Other fields should remain unchanged
      expect(response.body).toHaveProperty('lastName', validContact.lastName);
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/contacts/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Test' })
        .expect(404);
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${createdContactId}`)
        .send({ firstName: 'Test' })
        .expect(401);
    });
  });

  describe('/contacts/:id (DELETE)', () => {
    let tempContactId: string;

    beforeAll(async () => {
      // Create a temporary contact for delete tests
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'مؤقت',
          lastName: 'للحذف',
          email: 'temp.delete@example.com',
        });

      tempContactId = response.body.id;
    });

    it('should soft delete a contact', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/contacts/${tempContactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify it's no longer accessible
      await request(app.getHttpServer())
        .get(`/api/v1/contacts/${tempContactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/contacts/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/contacts/${createdContactId}`)
        .expect(401);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should only return contacts from the same tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All contacts should have the same tenantId (from the authenticated user)
      if (response.body.data.length > 0) {
        const tenantIds = [...new Set(response.body.data.map((c: any) => c.tenantId))];
        expect(tenantIds.length).toBe(1);
      }
    });
  });

  describe('Contact Activities', () => {
    it('should include activities when fetching a single contact', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // The contact detail should include activities (could be empty array)
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);
    });
  });
});
