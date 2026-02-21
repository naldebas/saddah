import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  notificationsApi,
  type NotificationsResponse,
} from '@/services/notifications.api';

/**
 * Hook to fetch all notifications with pagination
 */
export function useNotifications(limit = 20, offset = 0) {
  return useQuery({
    queryKey: [...queryKeys.notifications.list(), { limit, offset }],
    queryFn: () => notificationsApi.getAll(limit, offset),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });
}

/**
 * Hook to fetch unread notification count
 * Useful for the notification bell badge
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refetch every minute
    select: (data) => data.unreadCount,
  });
}

/**
 * Hook to mark a single notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: queryKeys.notifications.list(),
      });

      // Optimistically update the notification
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.list() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        }
      );

      // Optimistically update unread count
      queryClient.setQueryData<{ unreadCount: number }>(
        queryKeys.notifications.unreadCount(),
        (old) => ({ unreadCount: Math.max(0, (old?.unreadCount ?? 1) - 1) })
      );

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      // Revert to previous state on error
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousNotifications = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: queryKeys.notifications.list(),
      });

      // Optimistically mark all as read
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.list() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
          };
        }
      );

      queryClient.setQueryData<{ unreadCount: number }>(
        queryKeys.notifications.unreadCount(),
        { unreadCount: 0 }
      );

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook to delete a single notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.delete(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousNotifications = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: queryKeys.notifications.list(),
      });

      // Optimistically remove the notification
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.list() },
        (old) => {
          if (!old) return old;
          const deletedNotification = old.notifications.find((n) => n.id === notificationId);
          return {
            ...old,
            notifications: old.notifications.filter((n) => n.id !== notificationId),
            total: old.total - 1,
            unreadCount: deletedNotification && !deletedNotification.isRead
              ? old.unreadCount - 1
              : old.unreadCount,
          };
        }
      );

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook to clear all notifications
 */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: () => {
      // Reset the cache
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.list() },
        { notifications: [], total: 0, unreadCount: 0 }
      );
      queryClient.setQueryData<{ unreadCount: number }>(
        queryKeys.notifications.unreadCount(),
        { unreadCount: 0 }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
