import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DealsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let dealId: string;
  let pipelineId: string;
  let stageId: string;
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

    // Get a pipeline and stage for creating deals
    const pipeline = await prisma.pipeline.findFirst({
      where: { tenantId },
      include: { stages: true },
    });

    if (pipeline) {
      pipelineId = pipeline.id;
      stageId = pipeline.stages[0]?.id;
    }

    // Get a contact for linking to deals
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

  describe('/api/v1/deals (POST)', () => {
    it('should create a new deal', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'صفقة فيلا اختبارية',
          value: 2500000,
          currency: 'SAR',
          pipelineId,
          stageId,
          contactId,
          propertyType: 'villa',
          propertyLocation: 'الرياض - حي النرجس',
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('صفقة فيلا اختبارية');
      expect(response.body.value).toBe(2500000);
      expect(response.body.status).toBe('open');
      dealId = response.body.id;
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Incomplete Deal',
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/deals')
        .send({
          title: 'Unauthorized Deal',
          value: 1000000,
          pipelineId,
          stageId,
        })
        .expect(401);
    });
  });

  describe('/api/v1/deals (GET)', () => {
    it('should return paginated deals', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter deals by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deals?status=open')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((d: { status: string }) => d.status === 'open')).toBe(true);
    });

    it('should filter deals by pipeline', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/deals?pipelineId=${pipelineId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((d: { pipelineId: string }) => d.pipelineId === pipelineId)).toBe(true);
    });

    it('should search deals by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deals?search=اختبارية')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('/api/v1/deals/statistics (GET)', () => {
    it('should return deal statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deals/statistics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('byStage');
    });
  });

  describe('/api/v1/deals/:id (GET)', () => {
    it('should return a single deal', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/deals/${dealId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(dealId);
      expect(response.body.title).toBe('صفقة فيلا اختبارية');
    });

    it('should return 404 for non-existent deal', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/deals/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/deals/:id (PATCH)', () => {
    it('should update a deal', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/deals/${dealId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'صفقة فيلا محدثة',
          value: 2750000,
        })
        .expect(200);

      expect(response.body.title).toBe('صفقة فيلا محدثة');
      expect(response.body.value).toBe(2750000);
    });
  });

  describe('/api/v1/deals/:id/stage (PATCH)', () => {
    it('should move deal to a different stage', async () => {
      // Get another stage
      const pipeline = await prisma.pipeline.findFirst({
        where: { tenantId },
        include: { stages: { orderBy: { order: 'asc' } } },
      });

      const nextStage = pipeline?.stages[1];
      if (!nextStage) return;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/deals/${dealId}/stage`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          stageId: nextStage.id,
        })
        .expect(200);

      expect(response.body.stageId).toBe(nextStage.id);
    });
  });

  describe('/api/v1/deals/:id/status (PATCH)', () => {
    it('should update deal status to won', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/deals/${dealId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'won',
          lostReason: null,
        })
        .expect(200);

      expect(response.body.status).toBe('won');
    });

    it('should update deal status to lost with reason', async () => {
      // Create another deal to test lost status
      const newDealResponse = await request(app.getHttpServer())
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'صفقة للخسارة',
          value: 1000000,
          pipelineId,
          stageId,
        });

      const newDealId = newDealResponse.body.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/deals/${newDealId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'lost',
          lostReason: 'السعر مرتفع',
        })
        .expect(200);

      expect(response.body.status).toBe('lost');
      expect(response.body.lostReason).toBe('السعر مرتفع');

      // Clean up
      await request(app.getHttpServer())
        .delete(`/api/v1/deals/${newDealId}`)
        .set('Authorization', `Bearer ${accessToken}`);
    });
  });

  describe('/api/v1/deals/:id (DELETE)', () => {
    it('should delete a deal', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/deals/${dealId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/deals/${dealId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
