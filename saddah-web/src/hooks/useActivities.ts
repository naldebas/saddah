import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  activitiesApi,
  type Activity,
  type ActivitiesParams,
  type CreateActivityDto,
  type UpdateActivityDto,
  type CompleteActivityDto,
} from '@/services/activities.api';

/**
 * Hook to fetch paginated activities list
 */
export function useActivities(params: ActivitiesParams = {}) {
  return useQuery({
    queryKey: queryKeys.activities.list(params),
    queryFn: () => activitiesApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single activity by ID
 */
export function useActivity(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.activities.detail(id!),
    queryFn: () => activitiesApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch activity timeline for a contact or deal
 */
export function useActivityTimeline(contactId?: string, dealId?: string) {
  const params: ActivitiesParams = {};
  if (contactId) params.contactId = contactId;
  if (dealId) params.dealId = dealId;

  return useQuery({
    queryKey: queryKeys.activities.timeline(contactId, dealId),
    queryFn: () => activitiesApi.getTimeline(params),
    enabled: !!(contactId || dealId),
  });
}

/**
 * Hook to create a new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateActivityDto) => activitiesApi.create(data),
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.lists() });
      // Invalidate timeline for related contact/deal
      if (newActivity.contactId || newActivity.dealId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.timeline(
            newActivity.contactId || undefined,
            newActivity.dealId || undefined
          )
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onError: (error: Error) => {
      console.error('Failed to create activity:', error);
      toast.error('فشل في إنشاء النشاط');
    },
  });
}

/**
 * Hook to update an activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityDto }) =>
      activitiesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.activities.detail(id) });

      const previousActivity = queryClient.getQueryData<Activity>(
        queryKeys.activities.detail(id)
      );

      if (previousActivity) {
        queryClient.setQueryData<Activity>(queryKeys.activities.detail(id), {
          ...previousActivity,
          ...data,
        });
      }

      return { previousActivity };
    },
    onError: (error, { id }, context) => {
      if (context?.previousActivity) {
        queryClient.setQueryData(
          queryKeys.activities.detail(id),
          context.previousActivity
        );
      }
      console.error('Failed to update activity:', error);
      toast.error('فشل في تحديث النشاط');
    },
    onSettled: (data, _, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.lists() });
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.timeline(
            data.contactId || undefined,
            data.dealId || undefined
          )
        });
      }
    },
  });
}

/**
 * Hook to complete an activity
 */
export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CompleteActivityDto }) =>
      activitiesApi.complete(id, data || {}),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.activities.detail(id) });

      const previousActivity = queryClient.getQueryData<Activity>(
        queryKeys.activities.detail(id)
      );

      // Optimistic update - mark as completed
      if (previousActivity) {
        queryClient.setQueryData<Activity>(queryKeys.activities.detail(id), {
          ...previousActivity,
          completedAt: new Date().toISOString(),
        });
      }

      return { previousActivity };
    },
    onError: (error, { id }, context) => {
      if (context?.previousActivity) {
        queryClient.setQueryData(
          queryKeys.activities.detail(id),
          context.previousActivity
        );
      }
      console.error('Failed to complete activity:', error);
      toast.error('فشل في إكمال النشاط');
    },
    onSettled: (data, _, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.timeline(
            data.contactId || undefined,
            data.dealId || undefined
          )
        });
      }
    },
  });
}

/**
 * Hook to uncomplete an activity (undo completion)
 */
export function useUncompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activitiesApi.uncomplete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.activities.detail(id) });

      const previousActivity = queryClient.getQueryData<Activity>(
        queryKeys.activities.detail(id)
      );

      // Optimistic update - mark as not completed
      if (previousActivity) {
        queryClient.setQueryData<Activity>(queryKeys.activities.detail(id), {
          ...previousActivity,
          completedAt: null,
        });
      }

      return { previousActivity };
    },
    onError: (error, id, context) => {
      if (context?.previousActivity) {
        queryClient.setQueryData(
          queryKeys.activities.detail(id),
          context.previousActivity
        );
      }
      console.error('Failed to uncomplete activity:', error);
      toast.error('فشل في إلغاء إكمال النشاط');
    },
    onSettled: (data, _, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.timeline(
            data.contactId || undefined,
            data.dealId || undefined
          )
        });
      }
    },
  });
}

/**
 * Hook to delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activitiesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.activities.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.lists() });
      // Invalidate all timelines since we don't know which contact/deal it was for
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
    },
    onError: (error: Error) => {
      console.error('Failed to delete activity:', error);
      toast.error('فشل في حذف النشاط');
    },
  });
}
