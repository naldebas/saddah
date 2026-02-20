import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockActivity,
  createMockContact,
  createMockDeal,
  createMockActivities,
} from '../../../test/utils/mock-factory';
import { relativeDate, startOfToday, endOfToday } from '../../../test/utils/test-helpers';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let prisma: any;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';

  beforeEach(async () => {
    prisma = {
      activity: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      contact: {
        findFirst: jest.fn(),
      },
      deal: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create activity with all types (call, email, meeting, task, note)', async () => {
      const types = ['call', 'email', 'meeting', 'task', 'note'];

      for (const type of types) {
        const mockActivity = createMockActivity({ tenantId, createdById: userId, type });
        prisma.activity.create.mockResolvedValue(mockActivity);

        const result = await service.create(tenantId, userId, {
          type,
          subject: `Test ${type}`,
        });

        expect(result.type).toBe(type);
      }

      expect(prisma.activity.create).toHaveBeenCalledTimes(5);
    });

    it('should validate contact exists if provided', async () => {
      const contact = createMockContact({ tenantId });
      prisma.contact.findFirst.mockResolvedValue(contact);
      prisma.activity.create.mockResolvedValue(createMockActivity({ contactId: contact.id }));

      await service.create(tenantId, userId, {
        type: 'call',
        contactId: contact.id,
        subject: 'Call with contact',
      });

      expect(prisma.contact.findFirst).toHaveBeenCalledWith({
        where: { id: contact.id, tenantId, isActive: true },
      });
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.create(tenantId, userId, {
          type: 'call',
          contactId: 'non-existent-contact',
          subject: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate deal exists if provided', async () => {
      const deal = createMockDeal({ tenantId });
      prisma.deal.findFirst.mockResolvedValue(deal);
      prisma.activity.create.mockResolvedValue(createMockActivity({ dealId: deal.id }));

      await service.create(tenantId, userId, {
        type: 'meeting',
        dealId: deal.id,
        subject: 'Deal meeting',
      });

      expect(prisma.deal.findFirst).toHaveBeenCalledWith({
        where: { id: deal.id, tenantId },
      });
    });

    it('should throw NotFoundException when deal does not exist', async () => {
      prisma.deal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(tenantId, userId, {
          type: 'call',
          dealId: 'non-existent-deal',
          subject: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create activity with due date', async () => {
      const dueDate = relativeDate(2);
      const mockActivity = createMockActivity({ tenantId, dueDate });
      prisma.activity.create.mockResolvedValue(mockActivity);

      const result = await service.create(tenantId, userId, {
        type: 'task',
        subject: 'Task with due date',
        dueDate: dueDate.toISOString(),
      });

      expect(result.dueDate).toEqual(dueDate);
    });
  });

  describe('findAll', () => {
    it('should list activities with pagination', async () => {
      const activities = createMockActivities(5, { tenantId });
      prisma.activity.findMany.mockResolvedValue(activities);
      prisma.activity.count.mockResolvedValue(25);

      const result = await service.findAll(tenantId, { page: 1, limit: 5 });

      expect(result.data).toHaveLength(5);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should filter by type', async () => {
      const calls = createMockActivities(3, { tenantId, type: 'call' });
      prisma.activity.findMany.mockResolvedValue(calls);
      prisma.activity.count.mockResolvedValue(3);

      await service.findAll(tenantId, { type: 'call' });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'call' }),
        }),
      );
    });

    it('should filter by status (isCompleted)', async () => {
      const completed = createMockActivities(2, { tenantId, isCompleted: true });
      prisma.activity.findMany.mockResolvedValue(completed);
      prisma.activity.count.mockResolvedValue(2);

      await service.findAll(tenantId, { isCompleted: true });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isCompleted: true }),
        }),
      );
    });

    it('should filter by contact', async () => {
      const contactId = 'contact-uuid';
      const activities = createMockActivities(2, { tenantId, contactId });
      prisma.activity.findMany.mockResolvedValue(activities);
      prisma.activity.count.mockResolvedValue(2);

      await service.findAll(tenantId, { contactId });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contactId }),
        }),
      );
    });

    it('should filter by deal', async () => {
      const dealId = 'deal-uuid';
      const activities = createMockActivities(2, { tenantId, dealId });
      prisma.activity.findMany.mockResolvedValue(activities);
      prisma.activity.count.mockResolvedValue(2);

      await service.findAll(tenantId, { dealId });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dealId }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const dueDateFrom = '2024-01-01';
      const dueDateTo = '2024-01-31';
      prisma.activity.findMany.mockResolvedValue([]);
      prisma.activity.count.mockResolvedValue(0);

      await service.findAll(tenantId, { dueDateFrom, dueDateTo });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: new Date(dueDateFrom),
              lte: new Date(dueDateTo),
            },
          }),
        }),
      );
    });

    it('should enforce tenant isolation', async () => {
      prisma.activity.findMany.mockResolvedValue([]);
      prisma.activity.count.mockResolvedValue(0);

      await service.findAll(tenantId, {});

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return activity by id', async () => {
      const activity = createMockActivity({ tenantId });
      prisma.activity.findFirst.mockResolvedValue(activity);

      const result = await service.findOne(tenantId, activity.id);

      expect(result.id).toBe(activity.id);
    });

    it('should throw NotFoundException when activity does not exist', async () => {
      prisma.activity.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('complete', () => {
    it('should mark activity as complete', async () => {
      const activity = createMockActivity({ tenantId, isCompleted: false });
      const completedActivity = { ...activity, isCompleted: true, completedAt: new Date() };

      prisma.activity.findFirst.mockResolvedValue(activity);
      prisma.activity.update.mockResolvedValue(completedActivity);

      const result = await service.complete(tenantId, activity.id, { outcome: 'Successful' });

      expect(result.isCompleted).toBe(true);
      expect(result.completedAt).toBeDefined();
      expect(prisma.activity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isCompleted: true,
            completedAt: expect.any(Date),
            outcome: 'Successful',
          }),
        }),
      );
    });

    it('should throw BadRequestException when activity already completed', async () => {
      const completedActivity = createMockActivity({ tenantId, isCompleted: true });
      prisma.activity.findFirst.mockResolvedValue(completedActivity);

      await expect(
        service.complete(tenantId, completedActivity.id, { outcome: 'Success' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uncomplete', () => {
    it('should mark completed activity as incomplete', async () => {
      const activity = createMockActivity({ tenantId, isCompleted: true });
      const incompleteActivity = { ...activity, isCompleted: false, completedAt: null };

      prisma.activity.findFirst.mockResolvedValue(activity);
      prisma.activity.update.mockResolvedValue(incompleteActivity);

      const result = await service.uncomplete(tenantId, activity.id);

      expect(result.isCompleted).toBe(false);
      expect(result.completedAt).toBeNull();
    });

    it('should throw BadRequestException when activity not completed', async () => {
      const incompleteActivity = createMockActivity({ tenantId, isCompleted: false });
      prisma.activity.findFirst.mockResolvedValue(incompleteActivity);

      await expect(service.uncomplete(tenantId, incompleteActivity.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUpcoming', () => {
    it('should track overdue activities', async () => {
      const overdueActivity = createMockActivity({
        tenantId,
        dueDate: relativeDate(-1), // Yesterday
        isCompleted: false,
      });
      prisma.activity.findMany.mockResolvedValue([overdueActivity]);

      const result = await service.getUpcoming(tenantId);

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            isCompleted: false,
            dueDate: { lte: expect.any(Date) },
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('should return activity statistics', async () => {
      prisma.activity.count.mockResolvedValueOnce(10); // totalPending
      prisma.activity.count.mockResolvedValueOnce(3);  // overdue
      prisma.activity.count.mockResolvedValueOnce(2);  // dueToday
      prisma.activity.count.mockResolvedValueOnce(5);  // completedToday
      prisma.activity.groupBy.mockResolvedValue([
        { type: 'call', _count: 4 },
        { type: 'email', _count: 3 },
        { type: 'meeting', _count: 2 },
      ]);

      const result = await service.getStatistics(tenantId);

      expect(result).toEqual({
        totalPending: 10,
        overdue: 3,
        dueToday: 2,
        completedToday: 5,
        byType: [
          { type: 'call', count: 4 },
          { type: 'email', count: 3 },
          { type: 'meeting', count: 2 },
        ],
      });
    });

    it('should filter statistics by user', async () => {
      prisma.activity.count.mockResolvedValue(5);
      prisma.activity.groupBy.mockResolvedValue([]);

      await service.getStatistics(tenantId, userId);

      expect(prisma.activity.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdById: userId }),
        }),
      );
    });
  });

  describe('getTimeline', () => {
    it('should get activity timeline for a contact', async () => {
      const contactId = 'contact-uuid';
      const activities = createMockActivities(5, { tenantId, contactId });
      prisma.activity.findMany.mockResolvedValue(activities);

      const result = await service.getTimeline(tenantId, { contactId });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contactId }),
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(5);
    });

    it('should get activity timeline for a deal', async () => {
      const dealId = 'deal-uuid';
      const activities = createMockActivities(3, { tenantId, dealId });
      prisma.activity.findMany.mockResolvedValue(activities);

      const result = await service.getTimeline(tenantId, { dealId });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dealId }),
        }),
      );
      expect(result).toHaveLength(3);
    });

    it('should throw BadRequestException when neither contactId nor dealId provided', async () => {
      await expect(service.getTimeline(tenantId, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update activity', async () => {
      const activity = createMockActivity({ tenantId });
      const updatedActivity = { ...activity, subject: 'Updated subject' };

      prisma.activity.findFirst.mockResolvedValue(activity);
      prisma.activity.update.mockResolvedValue(updatedActivity);

      const result = await service.update(tenantId, activity.id, {
        subject: 'Updated subject',
      });

      expect(result.subject).toBe('Updated subject');
    });
  });

  describe('remove', () => {
    it('should delete activity', async () => {
      const activity = createMockActivity({ tenantId });
      prisma.activity.findFirst.mockResolvedValue(activity);
      prisma.activity.delete.mockResolvedValue(activity);

      const result = await service.remove(tenantId, activity.id);

      expect(result.message).toBeDefined();
      expect(prisma.activity.delete).toHaveBeenCalledWith({
        where: { id: activity.id },
      });
    });
  });
});
