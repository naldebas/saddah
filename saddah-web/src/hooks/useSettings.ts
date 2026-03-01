import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  settingsApi,
  type TenantSettingsResponse,
  type UpdateTenantSettingsDto,
  type NotificationPreferences,
  type UpdateNotificationPreferencesDto,
  type UserPreferences,
  type UpdateUserPreferencesDto,
  type UpdateWhatsAppConfigDto,
  type TestConnectionResult,
} from '@/services/settings.api';

// ============ Tenant Settings Hooks ============

/**
 * Hook to fetch tenant settings
 */
export function useTenantSettings() {
  return useQuery({
    queryKey: queryKeys.settings.tenant(),
    queryFn: () => settingsApi.getTenantSettings(),
  });
}

/**
 * Hook to update tenant settings
 */
export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTenantSettingsDto) => settingsApi.updateTenantSettings(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.tenant() });

      const previousSettings = queryClient.getQueryData<TenantSettingsResponse>(
        queryKeys.settings.tenant()
      );

      if (previousSettings) {
        queryClient.setQueryData<TenantSettingsResponse>(queryKeys.settings.tenant(), {
          ...previousSettings,
          settings: {
            ...previousSettings.settings,
            ...data,
          },
        });
      }

      return { previousSettings };
    },
    onError: (error, _, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.settings.tenant(), context.previousSettings);
      }
      console.error('Failed to update tenant settings:', error);
      toast.error('فشل في تحديث إعدادات المنظمة');
    },
    onSuccess: () => {
      toast.success('تم تحديث إعدادات المنظمة بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.tenant() });
    },
  });
}

// ============ Notification Preferences Hooks ============

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.settings.notifications(),
    queryFn: () => settingsApi.getNotificationPreferences(),
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesDto) =>
      settingsApi.updateNotificationPreferences(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.notifications() });

      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(
        queryKeys.settings.notifications()
      );

      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreferences>(queryKeys.settings.notifications(), {
          ...previousPreferences,
          ...data,
        });
      }

      return { previousPreferences };
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKeys.settings.notifications(), context.previousPreferences);
      }
      console.error('Failed to update notification preferences:', error);
      toast.error('فشل في تحديث إعدادات الإشعارات');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.notifications() });
    },
  });
}

// ============ User Preferences Hooks ============

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: queryKeys.settings.preferences(),
    queryFn: () => settingsApi.getUserPreferences(),
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserPreferencesDto) => settingsApi.updateUserPreferences(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.preferences() });

      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        queryKeys.settings.preferences()
      );

      if (previousPreferences) {
        queryClient.setQueryData<UserPreferences>(queryKeys.settings.preferences(), {
          ...previousPreferences,
          ...data,
        });
      }

      return { previousPreferences };
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKeys.settings.preferences(), context.previousPreferences);
      }
      console.error('Failed to update user preferences:', error);
      toast.error('فشل في تحديث التفضيلات');
    },
    onSuccess: () => {
      toast.success('تم تحديث التفضيلات بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.preferences() });
    },
  });
}

// ============ Plan Info Hook ============

/**
 * Hook to fetch plan information
 */
export function usePlanInfo() {
  return useQuery({
    queryKey: queryKeys.settings.plan(),
    queryFn: () => settingsApi.getPlanInfo(),
  });
}

// ============ WhatsApp Config Hooks ============

/**
 * Hook to fetch WhatsApp configuration
 */
export function useWhatsAppConfig() {
  return useQuery({
    queryKey: queryKeys.settings.whatsapp(),
    queryFn: () => settingsApi.getWhatsAppConfig(),
  });
}

/**
 * Hook to update WhatsApp configuration
 */
export function useUpdateWhatsAppConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWhatsAppConfigDto) => settingsApi.updateWhatsAppConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.whatsapp() });
      toast.success('تم حفظ إعدادات الواتساب بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to update WhatsApp config:', error);
      toast.error('فشل في حفظ إعدادات الواتساب');
    },
  });
}

/**
 * Hook to test WhatsApp connection
 */
export function useTestWhatsAppConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.testWhatsAppConnection(),
    onSuccess: (result: TestConnectionResult) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.whatsapp() });
      if (result.success) {
        toast.success('تم التحقق من الاتصال بنجاح');
      } else {
        toast.error(result.error || 'فشل اختبار الاتصال');
      }
    },
    onError: (error: Error) => {
      console.error('Failed to test WhatsApp connection:', error);
      toast.error('فشل في اختبار الاتصال');
    },
  });
}

/**
 * Hook to activate WhatsApp integration
 */
export function useActivateWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.activateWhatsApp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.whatsapp() });
      toast.success('تم تفعيل تكامل الواتساب بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to activate WhatsApp:', error);
      toast.error('فشل في تفعيل الواتساب. تأكد من اختبار الاتصال أولاً.');
    },
  });
}

/**
 * Hook to deactivate WhatsApp integration
 */
export function useDeactivateWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.deactivateWhatsApp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.whatsapp() });
      toast.success('تم إلغاء تفعيل تكامل الواتساب');
    },
    onError: (error: Error) => {
      console.error('Failed to deactivate WhatsApp:', error);
      toast.error('فشل في إلغاء تفعيل الواتساب');
    },
  });
}

/**
 * Hook to delete WhatsApp configuration
 */
export function useDeleteWhatsAppConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.deleteWhatsAppConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.whatsapp() });
      toast.success('تم حذف إعدادات الواتساب');
    },
    onError: (error: Error) => {
      console.error('Failed to delete WhatsApp config:', error);
      toast.error('فشل في حذف إعدادات الواتساب');
    },
  });
}

/**
 * Hook to rotate WhatsApp webhook secret
 */
export function useRotateWhatsAppSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.rotateWhatsAppSecret(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.whatsapp() });
      toast.success('تم تجديد مفتاح الويب هوك');
    },
    onError: (error: Error) => {
      console.error('Failed to rotate WhatsApp secret:', error);
      toast.error('فشل في تجديد مفتاح الويب هوك');
    },
  });
}
