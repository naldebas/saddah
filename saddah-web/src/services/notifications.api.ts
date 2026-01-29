// src/services/notifications.api.ts
import { api } from './api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationsApi = {
  getAll: async (limit = 20, offset = 0): Promise<NotificationsResponse> => {
    const response = await api.get('/notifications', {
      params: { limit, offset },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  delete: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  clearAll: async (): Promise<{ count: number }> => {
    const response = await api.delete('/notifications');
    return response.data;
  },
};
