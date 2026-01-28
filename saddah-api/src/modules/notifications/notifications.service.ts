// src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  // In-memory storage for notifications (in production, use a database table)
  private notifications: Notification[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      isRead: false,
      createdAt: new Date(),
    };

    this.notifications.unshift(notification);

    // Keep only last 100 notifications per user
    const userNotifications = this.notifications.filter(n => n.userId === dto.userId);
    if (userNotifications.length > 100) {
      const toRemove = userNotifications.slice(100);
      this.notifications = this.notifications.filter(n => !toRemove.includes(n));
    }

    return notification;
  }

  async findAllForUser(userId: string, limit = 20, offset = 0): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const userNotifications = this.notifications.filter(n => n.userId === userId);
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    return {
      notifications: userNotifications.slice(offset, offset + limit),
      total: userNotifications.length,
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification | null> {
    const notification = this.notifications.find(n => n.id === notificationId && n.userId === userId);
    if (notification) {
      notification.isRead = true;
    }
    return notification || null;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    let count = 0;
    this.notifications.forEach(n => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    });
    return { count };
  }

  async delete(userId: string, notificationId: string): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === notificationId && n.userId === userId);
    if (index > -1) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  async clearAll(userId: string): Promise<{ count: number }> {
    const beforeCount = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.userId !== userId);
    return { count: beforeCount - this.notifications.length };
  }

  // Helper methods for creating specific notification types
  async notifyNewLead(userId: string, leadName: string, source: string): Promise<Notification> {
    return this.create({
      userId,
      type: 'new_lead',
      title: 'عميل محتمل جديد',
      message: `تم إضافة عميل محتمل جديد: ${leadName} من ${source}`,
      data: { leadName, source },
    });
  }

  async notifyDealStageChange(userId: string, dealTitle: string, newStage: string): Promise<Notification> {
    return this.create({
      userId,
      type: 'deal_stage_change',
      title: 'تغيير مرحلة الصفقة',
      message: `تم نقل الصفقة "${dealTitle}" إلى مرحلة ${newStage}`,
      data: { dealTitle, newStage },
    });
  }

  async notifyActivityDue(userId: string, activitySubject: string, dueDate: Date): Promise<Notification> {
    return this.create({
      userId,
      type: 'activity_due',
      title: 'موعد نشاط قادم',
      message: `النشاط "${activitySubject}" مستحق في ${dueDate.toLocaleDateString('ar-SA')}`,
      data: { activitySubject, dueDate: dueDate.toISOString() },
    });
  }

  async notifyNewMessage(userId: string, contactName: string): Promise<Notification> {
    return this.create({
      userId,
      type: 'new_message',
      title: 'رسالة جديدة',
      message: `لديك رسالة جديدة من ${contactName}`,
      data: { contactName },
    });
  }

  async notifyDealWon(userId: string, dealTitle: string, value: number): Promise<Notification> {
    return this.create({
      userId,
      type: 'deal_won',
      title: 'تم إغلاق صفقة بنجاح! 🎉',
      message: `تهانينا! تم إغلاق الصفقة "${dealTitle}" بقيمة ${value.toLocaleString('ar-SA')} ر.س`,
      data: { dealTitle, value },
    });
  }
}
