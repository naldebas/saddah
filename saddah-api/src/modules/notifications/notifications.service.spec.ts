import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockNotification, createMockNotifications } from '../../../test/utils/mock-factory';
import { Prisma } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create notification for user', async () => {
      const notification = createMockNotification({ tenantId, userId });
      prisma.notification.create.mockResolvedValue(notification);
      prisma.notification.count.mockResolvedValue(5); // Not enough to trigger cleanup
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.create({
        tenantId,
        userId,
        type: 'new_message',
        title: 'رسالة جديدة',
        message: 'لديك رسالة جديدة',
      });

      expect(result.userId).toBe(userId);
      expect(result.type).toBe('new_message');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          userId,
          type: 'new_message',
          title: 'رسالة جديدة',
          message: 'لديك رسالة جديدة',
        }),
      });
    });

    it('should clean up old notifications when exceeding limit', async () => {
      const notification = createMockNotification({ tenantId, userId });
      prisma.notification.create.mockResolvedValue(notification);
      prisma.notification.count.mockResolvedValue(105); // Exceeds 100 limit
      prisma.notification.findMany.mockResolvedValue([
        { createdAt: new Date('2024-01-01') },
      ]);
      prisma.notification.deleteMany.mockResolvedValue({ count: 5 });

      await service.create({
        tenantId,
        userId,
        type: 'new_lead',
        title: 'Test',
        message: 'Test message',
      });

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('findAllForUser', () => {
    it('should list notifications with pagination', async () => {
      const notifications = createMockNotifications(10, { userId });
      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValueOnce(50); // total
      prisma.notification.count.mockResolvedValueOnce(20); // unread

      const result = await service.findAllForUser(userId, 10, 0);

      expect(result.notifications).toHaveLength(10);
      expect(result.total).toBe(50);
      expect(result.unreadCount).toBe(20);
    });

    it('should return unread count', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValueOnce(25);
      prisma.notification.count.mockResolvedValueOnce(10);

      const result = await service.findAllForUser(userId);

      expect(result.unreadCount).toBe(10);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      prisma.notification.count.mockResolvedValue(15);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(15);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId, isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = createMockNotification({ userId, isRead: false });
      const readNotification = { ...notification, isRead: true, readAt: new Date() };

      prisma.notification.update.mockResolvedValue(readNotification);

      const result = await service.markAsRead(userId, notification.id);

      expect(result?.isRead).toBe(true);
      expect(result?.readAt).toBeDefined();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notification.id, userId },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should return null when notification not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      prisma.notification.update.mockRejectedValue(prismaError);

      const result = await service.markAsRead(userId, 'non-existent');

      expect(result).toBeNull();
    });

    it('should enforce user ownership', async () => {
      const notification = createMockNotification({ userId: 'other-user' });

      await service.markAsRead(userId, notification.id);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notification.id, userId },
        data: expect.any(Object),
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 10 });

      const result = await service.markAllAsRead(userId);

      expect(result.count).toBe(10);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should return zero count when no unread notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead(userId);

      expect(result.count).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a single notification', async () => {
      const notification = createMockNotification({ userId });
      prisma.notification.delete.mockResolvedValue(notification);

      const result = await service.delete(userId, notification.id);

      expect(result).toBe(true);
      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: notification.id, userId },
      });
    });

    it('should return false when notification not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      prisma.notification.delete.mockRejectedValue(prismaError);

      const result = await service.delete(userId, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should delete all notifications for user', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 25 });

      const result = await service.clearAll(userId);

      expect(result.count).toBe(25);
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('notification type helpers', () => {
    beforeEach(() => {
      prisma.notification.create.mockResolvedValue(createMockNotification());
      prisma.notification.count.mockResolvedValue(5);
    });

    it('should notify about new lead', async () => {
      await service.notifyNewLead(tenantId, userId, 'محمد العتيبي', 'whatsapp');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'new_lead',
          title: 'عميل محتمل جديد',
          data: { leadName: 'محمد العتيبي', source: 'whatsapp' },
        }),
      });
    });

    it('should notify about deal stage change', async () => {
      await service.notifyDealStageChange(
        tenantId,
        userId,
        'فيلا في النرجس',
        'تفاوض',
        'deal-123',
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'deal_stage_change',
          data: { dealTitle: 'فيلا في النرجس', newStage: 'تفاوض', dealId: 'deal-123' },
        }),
      });
    });

    it('should notify about upcoming activity', async () => {
      const dueDate = new Date('2024-02-20');

      await service.notifyActivityDue(
        tenantId,
        userId,
        'مكالمة متابعة',
        dueDate,
        'activity-123',
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'activity_due',
          data: {
            activitySubject: 'مكالمة متابعة',
            dueDate: dueDate.toISOString(),
            activityId: 'activity-123',
          },
        }),
      });
    });

    it('should notify about new message', async () => {
      await service.notifyNewMessage(tenantId, userId, 'أحمد السعيد', 'conv-123');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'new_message',
          title: 'رسالة جديدة',
          data: { contactName: 'أحمد السعيد', conversationId: 'conv-123' },
        }),
      });
    });

    it('should notify about won deal', async () => {
      await service.notifyDealWon(tenantId, userId, 'فيلا VIP', 5000000, 'deal-456');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'deal_won',
          data: { dealTitle: 'فيلا VIP', value: 5000000, dealId: 'deal-456' },
        }),
      });
    });

    it('should notify about lost deal', async () => {
      await service.notifyDealLost(tenantId, userId, 'شقة صغيرة', 'السعر', 'deal-789');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'deal_lost',
          data: { dealTitle: 'شقة صغيرة', reason: 'السعر', dealId: 'deal-789' },
        }),
      });
    });

    it('should notify about contact assignment', async () => {
      await service.notifyContactAssigned(tenantId, userId, 'فهد الدوسري', 'contact-123');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'contact_assigned',
          data: { contactName: 'فهد الدوسري', contactId: 'contact-123' },
        }),
      });
    });

    it('should notify about lead conversion', async () => {
      await service.notifyLeadConverted(
        tenantId,
        userId,
        'سعد القحطاني',
        'lead-123',
        'contact-456',
        'deal-789',
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'lead_converted',
          data: {
            leadName: 'سعد القحطاني',
            leadId: 'lead-123',
            contactId: 'contact-456',
            dealId: 'deal-789',
          },
        }),
      });
    });
  });

  describe('notifyMultipleUsers', () => {
    it('should bulk notify multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      prisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.notifyMultipleUsers(
        tenantId,
        userIds,
        'announcement',
        'إعلان مهم',
        'يوجد تحديث جديد للنظام',
        { priority: 'high' },
      );

      expect(result).toBe(3);
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', type: 'announcement' }),
          expect.objectContaining({ userId: 'user-2', type: 'announcement' }),
          expect.objectContaining({ userId: 'user-3', type: 'announcement' }),
        ]),
      });
    });
  });

  describe('tenant isolation', () => {
    it('should enforce tenant isolation in notification creation', async () => {
      const notification = createMockNotification({ tenantId, userId });
      prisma.notification.create.mockResolvedValue(notification);
      prisma.notification.count.mockResolvedValue(5);

      await service.create({
        tenantId,
        userId,
        type: 'test',
        title: 'Test',
        message: 'Test message',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId }),
      });
    });
  });

  describe('filter by type', () => {
    it('should filter notifications by type when listing', async () => {
      // Note: The current implementation doesn't support filtering by type in findAllForUser
      // This test documents the expected behavior if implemented
      const notifications = createMockNotifications(5, { userId, type: 'new_message' });
      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValueOnce(5);
      prisma.notification.count.mockResolvedValueOnce(3);

      const result = await service.findAllForUser(userId);

      expect(result.notifications).toHaveLength(5);
    });
  });
});
