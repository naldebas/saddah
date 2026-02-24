// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Notification, Prisma, Prisma as PrismaTypes } from '@prisma/client';

export interface CreateNotificationDto {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: (dto.data || {}) as Prisma.InputJsonValue,
      },
    });

    // Clean up old notifications - keep only last 100 per user
    await this.cleanupOldNotifications(dto.userId);

    return notification;
  }

  /**
   * Find all notifications for a user with pagination
   */
  async findAllForUser(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<NotificationResponse> {
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification | null> {
    try {
      const notification = await this.prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user owns this notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      return notification;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Delete a single notification
   */
  async delete(userId: string, notificationId: string): Promise<boolean> {
    try {
      await this.prisma.notification.delete({
        where: {
          id: notificationId,
          userId, // Ensure user owns this notification
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  async clearAll(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { count: result.count };
  }

  /**
   * Clean up old notifications - keep only the most recent 100 per user
   */
  private async cleanupOldNotifications(userId: string): Promise<void> {
    const count = await this.prisma.notification.count({
      where: { userId },
    });

    if (count > 100) {
      // Get the ID of the 100th notification
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 100,
        take: 1,
        select: { createdAt: true },
      });

      if (notifications.length > 0) {
        // Delete all notifications older than the 100th
        await this.prisma.notification.deleteMany({
          where: {
            userId,
            createdAt: { lt: notifications[0].createdAt },
          },
        });
      }
    }
  }

  // ============================================
  // HELPER METHODS FOR SPECIFIC NOTIFICATION TYPES
  // ============================================

  /**
   * Notify user about a new lead
   */
  async notifyNewLead(
    tenantId: string,
    userId: string,
    leadName: string,
    source: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'new_lead',
      title: 'عميل محتمل جديد',
      message: `تم إضافة عميل محتمل جديد: ${leadName} من ${source}`,
      data: { leadName, source },
    });
  }

  /**
   * Notify user about a deal stage change
   */
  async notifyDealStageChange(
    tenantId: string,
    userId: string,
    dealTitle: string,
    newStage: string,
    dealId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'deal_stage_change',
      title: 'تغيير مرحلة الصفقة',
      message: `تم نقل الصفقة "${dealTitle}" إلى مرحلة ${newStage}`,
      data: { dealTitle, newStage, dealId },
    });
  }

  /**
   * Notify user about an upcoming activity
   */
  async notifyActivityDue(
    tenantId: string,
    userId: string,
    activitySubject: string,
    dueDate: Date,
    activityId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'activity_due',
      title: 'موعد نشاط قادم',
      message: `النشاط "${activitySubject}" مستحق في ${dueDate.toLocaleDateString('ar-SA')}`,
      data: { activitySubject, dueDate: dueDate.toISOString(), activityId },
    });
  }

  /**
   * Notify user about a new message
   */
  async notifyNewMessage(
    tenantId: string,
    userId: string,
    contactName: string,
    conversationId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'new_message',
      title: 'رسالة جديدة',
      message: `لديك رسالة جديدة من ${contactName}`,
      data: { contactName, conversationId },
    });
  }

  /**
   * Notify user about a won deal
   */
  async notifyDealWon(
    tenantId: string,
    userId: string,
    dealTitle: string,
    value: number,
    dealId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'deal_won',
      title: 'تم إغلاق صفقة بنجاح! 🎉',
      message: `تهانينا! تم إغلاق الصفقة "${dealTitle}" بقيمة ${value.toLocaleString('ar-SA')} ر.س`,
      data: { dealTitle, value, dealId },
    });
  }

  /**
   * Notify user about a lost deal
   */
  async notifyDealLost(
    tenantId: string,
    userId: string,
    dealTitle: string,
    reason?: string,
    dealId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'deal_lost',
      title: 'صفقة خاسرة',
      message: `للأسف، تم إغلاق الصفقة "${dealTitle}" كخاسرة${reason ? `: ${reason}` : ''}`,
      data: { dealTitle, reason, dealId },
    });
  }

  /**
   * Notify user about being assigned to a contact
   */
  async notifyContactAssigned(
    tenantId: string,
    userId: string,
    contactName: string,
    contactId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'contact_assigned',
      title: 'تم تعيين جهة اتصال',
      message: `تم تعيينك كمسؤول عن جهة الاتصال: ${contactName}`,
      data: { contactName, contactId },
    });
  }

  /**
   * Notify user about lead conversion
   */
  async notifyLeadConverted(
    tenantId: string,
    userId: string,
    leadName: string,
    leadId?: string,
    contactId?: string,
    dealId?: string,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'lead_converted',
      title: 'تم تحويل عميل محتمل',
      message: `تم تحويل العميل المحتمل "${leadName}" إلى جهة اتصال`,
      data: { leadName, leadId, contactId, dealId },
    });
  }

  /**
   * Notify user about a failed WhatsApp message
   */
  async notifyWhatsAppMessageFailed(
    tenantId: string,
    userId: string,
    recipientPhone: string,
    errorMessage: string,
    conversationId?: string,
    messageId?: string,
    canRetry?: boolean,
  ): Promise<Notification> {
    return this.create({
      tenantId,
      userId,
      type: 'whatsapp_message_failed',
      title: 'فشل إرسال رسالة واتساب',
      message: `فشل إرسال الرسالة إلى ${recipientPhone}: ${errorMessage}`,
      data: { recipientPhone, errorMessage, conversationId, messageId, canRetry },
    });
  }

  /**
   * Bulk notify multiple users
   */
  async notifyMultipleUsers(
    tenantId: string,
    userIds: string[],
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<number> {
    const notifications = userIds.map((userId) => ({
      tenantId,
      userId,
      type,
      title,
      message,
      data: (data || {}) as Prisma.InputJsonValue,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications as Prisma.NotificationCreateManyInput[],
    });

    return result.count;
  }
}
