import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  dealsApi,
  pipelinesApi,
  type Deal,
  type DealsParams,
  type CreateDealDto,
  type UpdateDealDto,
  type MoveDealDto,
  type CloseDealDto,
  type KanbanResponse,
} from '@/services/deals.api';

/**
 * Hook to fetch paginated deals list
 */
export function useDeals(params: DealsParams = {}) {
  return useQuery({
    queryKey: queryKeys.deals.list(params),
    queryFn: () => dealsApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single deal by ID
 */
export function useDeal(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id!),
    queryFn: () => dealsApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch deals in Kanban format for a pipeline
 */
export function useDealsKanban(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.kanban(pipelineId!),
    queryFn: () => dealsApi.getKanban(pipelineId!),
    enabled: !!pipelineId,
  });
}

/**
 * Hook to fetch all pipelines
 */
export function usePipelines() {
  return useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => pipelinesApi.getAll(),
    staleTime: 1000 * 60 * 10, // 10 minutes - pipelines don't change often
  });
}

/**
 * Hook to fetch a single pipeline by ID
 */
export function usePipeline(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.pipelines.detail(id!),
    queryFn: () => pipelinesApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new deal
 */
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDealDto) => dealsApi.create(data),
    onSuccess: (newDeal) => {
      // Invalidate deals list and kanban
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.deals.kanban(newDeal.pipelineId)
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create deal:', error);
      toast.error('فشل في إنشاء الصفقة');
    },
  });
}

/**
 * Hook to update a deal
 */
export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealDto }) =>
      dealsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.detail(id) });

      const previousDeal = queryClient.getQueryData<Deal>(
        queryKeys.deals.detail(id)
      );

      if (previousDeal) {
        // Create merged deal with proper type handling
        // Convert value to string if provided (Deal.value is string, UpdateDealDto.value is number)
        const mergedDeal: Deal = {
          ...previousDeal,
          ...(data.title !== undefined && { title: data.title }),
          ...(data.contactId !== undefined && { contactId: data.contactId }),
          ...(data.companyId !== undefined && { companyId: data.companyId }),
          ...(data.stageId !== undefined && { stageId: data.stageId }),
          ...(data.value !== undefined && { value: String(data.value) }),
          ...(data.currency !== undefined && { currency: data.currency }),
          ...(data.expectedCloseDate !== undefined && { expectedCloseDate: data.expectedCloseDate }),
          ...(data.tags !== undefined && { tags: data.tags }),
        };
        queryClient.setQueryData<Deal>(queryKeys.deals.detail(id), mergedDeal);
      }

      return { previousDeal };
    },
    onError: (error, { id }, context) => {
      if (context?.previousDeal) {
        queryClient.setQueryData(
          queryKeys.deals.detail(id),
          context.previousDeal
        );
      }
      console.error('Failed to update deal:', error);
      toast.error('فشل في تحديث الصفقة');
    },
    onSettled: (data, _, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.deals.kanban(data.pipelineId)
        });
      }
    },
  });
}

/**
 * Hook to move a deal to a different stage (optimistic update for drag & drop)
 */
export function useMoveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveDealDto }) =>
      dealsApi.move(id, data),
    onMutate: async ({ id, data }) => {
      // Find the deal in kanban cache and move it optimistically
      // This provides instant feedback for drag & drop
      const deal = queryClient.getQueryData<Deal>(queryKeys.deals.detail(id));

      if (deal) {
        // Get kanban data
        const kanbanKey = queryKeys.deals.kanban(deal.pipelineId);
        const previousKanban = queryClient.getQueryData<KanbanResponse>(kanbanKey);

        if (previousKanban) {
          // Optimistically update kanban
          const newStages = previousKanban.stages.map((stage) => {
            // Remove deal from current stage
            if (stage.id === deal.stageId) {
              return {
                ...stage,
                deals: stage.deals.filter((d) => d.id !== id),
                count: stage.count - 1,
                totalValue: stage.totalValue - Number(deal.value),
              };
            }
            // Add deal to new stage
            if (stage.id === data.stageId) {
              const updatedDeal = { ...deal, stageId: data.stageId };
              return {
                ...stage,
                deals: [...stage.deals, updatedDeal],
                count: stage.count + 1,
                totalValue: stage.totalValue + Number(deal.value),
              };
            }
            return stage;
          });

          queryClient.setQueryData<KanbanResponse>(kanbanKey, {
            ...previousKanban,
            stages: newStages,
          });
        }

        return { previousKanban, pipelineId: deal.pipelineId };
      }

      return {};
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousKanban && context?.pipelineId) {
        queryClient.setQueryData(
          queryKeys.deals.kanban(context.pipelineId),
          context.previousKanban
        );
      }
      console.error('Failed to move deal:', error);
      toast.error('فشل في نقل الصفقة');
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.deals.kanban(data.pipelineId)
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.deals.detail(data.id)
        });
      }
    },
  });
}

/**
 * Hook to close a deal (won/lost)
 */
export function useCloseDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloseDealDto }) =>
      dealsApi.close(id, data),
    onSuccess: (closedDeal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(closedDeal.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.deals.kanban(closedDeal.pipelineId)
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onError: (error: Error) => {
      console.error('Failed to close deal:', error);
      toast.error('فشل في إغلاق الصفقة');
    },
  });
}

/**
 * Hook to reopen a closed deal
 */
export function useReopenDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.reopen(id),
    onSuccess: (reopenedDeal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(reopenedDeal.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.deals.kanban(reopenedDeal.pipelineId)
      });
    },
    onError: (error: Error) => {
      console.error('Failed to reopen deal:', error);
      toast.error('فشل في إعادة فتح الصفقة');
    },
  });
}

/**
 * Hook to delete a deal
 */
export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.deals.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      // Invalidate all kanban caches since we don't know the pipeline
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
    onError: (error: Error) => {
      console.error('Failed to delete deal:', error);
      toast.error('فشل في حذف الصفقة');
    },
  });
}
