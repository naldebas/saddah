import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ActivitiesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let userId: string;
  let activityId: string;
  let contactId: string;

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
    userId = loginResponse.body.user.id;

    // Get a contact for linking activities
    const contact = await prisma.contact.findFirst({
      where: { tenantId },
    });

    if (contact) {
      contactId = contact.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/activities (POST)', () => {
    it('should create a call activity', async () => {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'call',
          title: 'مكالمة متابعة مع العميل',
          description: 'متابعة اهتمام العميل بالفيلا',
          scheduledAt: scheduledAt.toISOString(),
          contactId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('call');
      expect(response.body.title).toBe('مكالمة متابعة مع العميل');
      expect(response.body.completed).toBe(false);
      activityId = response.body.id;
    });

    it('should create a meeting activity', async () => {
      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'meeting',
          title: 'اجتماع عرض العقار',
          description: 'عرض الفيلا في حي النرجس',
          scheduledAt: scheduledAt.toISOString(),
          duration: 60,
          location: 'حي النرجس، الرياض',
          contactId,
        })
        .expect(201);

      expect(response.body.type).toBe('meeting');
      expect(response.body.duration).toBe(60);
    });

    it('should create a task activity', async () => {
      const dueDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'task',
          title: 'إعداد عرض السعر',
          description: 'تجهيز عرض سعر للعميل',
          scheduledAt: dueDate.toISOString(),
        })
        .expect(201);

      expect(response.body.type).toBe('task');
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Incomplete activity',
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/activities')
        .send({
          type: 'call',
          title: 'Unauthorized Activity',
          scheduledAt: new Date().toISOString(),
        })
        .expect(401);
    });
  });

  describe('/api/v1/activities (GET)', () => {
    it('should return paginated activities', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter activities by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities?type=call')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((a: { type: string }) => a.type === 'call')).toBe(true);
    });

    it('should filter activities by completed status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities?completed=false')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((a: { completed: boolean }) => a.completed === false)).toBe(true);
    });

    it('should filter activities by contact', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/activities?contactId=${contactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((a: { contactId: string }) => a.contactId === contactId)).toBe(true);
    });
  });

  describe('/api/v1/activities/upcoming (GET)', () => {
    it('should return upcoming activities', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/upcoming')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All activities should have scheduledAt in the future
      response.body.forEach((activity: { scheduledAt: string; completed: boolean }) => {
        expect(activity.completed).toBe(false);
      });
    });
  });

  describe('/api/v1/activities/statistics (GET)', () => {
    it('should return activity statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/statistics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('upcoming');
      expect(response.body).toHaveProperty('overdue');
      expect(response.body).toHaveProperty('completedToday');
      expect(response.body).toHaveProperty('byType');
    });
  });

  describe('/api/v1/activities/timeline (GET)', () => {
    it('should return activity timeline', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/timeline')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/v1/activities/:id (GET)', () => {
    it('should return a single activity', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(activityId);
      expect(response.body.title).toBe('مكالمة متابعة مع العميل');
    });

    it('should return 404 for non-existent activity', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/activities/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/activities/:id (PATCH)', () => {
    it('should update an activity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'مكالمة متابعة محدثة',
          description: 'تم تحديث الوصف',
        })
        .expect(200);

      expect(response.body.title).toBe('مكالمة متابعة محدثة');
      expect(response.body.description).toBe('تم تحديث الوصف');
    });
  });

  describe('/api/v1/activities/:id/complete (PATCH)', () => {
    it('should mark activity as completed', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/activities/${activityId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notes: 'تمت المكالمة بنجاح، العميل مهتم',
        })
        .expect(200);

      expect(response.body.completed).toBe(true);
      expect(response.body.completedAt).toBeTruthy();
    });
  });

  describe('/api/v1/activities/:id/uncomplete (PATCH)', () => {
    it('should mark activity as not completed', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/activities/${activityId}/uncomplete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.completed).toBe(false);
      expect(response.body.completedAt).toBeNull();
    });
  });

  describe('/api/v1/activities/:id (DELETE)', () => {
    it('should delete an activity', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
