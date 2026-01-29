import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  pipelinesApi,
  type Pipeline,
  type PipelineStage,
  type CreatePipelineDto,
  type UpdatePipelineDto,
  type CreateStageDto,
  type UpdateStageDto,
} from '@/services/pipelines.api';

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
 * Hook to create a new pipeline
 */
export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePipelineDto) => pipelinesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    },
    onError: (error: Error) => {
      console.error('Failed to create pipeline:', error);
      toast.error('فشل في إنشاء المسار');
    },
  });
}

/**
 * Hook to update a pipeline
 */
export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePipelineDto }) =>
      pipelinesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pipelines.detail(id) });

      const previousPipeline = queryClient.getQueryData<Pipeline>(
        queryKeys.pipelines.detail(id)
      );

      if (previousPipeline) {
        queryClient.setQueryData<Pipeline>(queryKeys.pipelines.detail(id), {
          ...previousPipeline,
          ...data,
        });
      }

      return { previousPipeline };
    },
    onError: (error, { id }, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(
          queryKeys.pipelines.detail(id),
          context.previousPipeline
        );
      }
      console.error('Failed to update pipeline:', error);
      toast.error('فشل في تحديث المسار');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
    },
  });
}

/**
 * Hook to delete a pipeline
 */
export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pipelinesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.pipelines.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
      // Also invalidate deals since they depend on pipelines
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
    onError: (error: Error) => {
      console.error('Failed to delete pipeline:', error);
      toast.error('فشل في حذف المسار');
    },
  });
}

/**
 * Hook to create a new stage in a pipeline
 */
export function useCreateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, data }: { pipelineId: string; data: CreateStageDto }) =>
      pipelinesApi.createStage(pipelineId, data),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.kanban(pipelineId) });
    },
    onError: (error: Error) => {
      console.error('Failed to create stage:', error);
      toast.error('فشل في إنشاء المرحلة');
    },
  });
}

/**
 * Hook to update a stage
 */
export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      data,
    }: {
      pipelineId: string;
      stageId: string;
      data: UpdateStageDto;
    }) => pipelinesApi.updateStage(pipelineId, stageId, data),
    onMutate: async ({ pipelineId, stageId, data }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.pipelines.detail(pipelineId)
      });

      const previousPipeline = queryClient.getQueryData<Pipeline>(
        queryKeys.pipelines.detail(pipelineId)
      );

      if (previousPipeline) {
        const updatedStages = previousPipeline.stages.map((stage) =>
          stage.id === stageId ? { ...stage, ...data } : stage
        );
        queryClient.setQueryData<Pipeline>(queryKeys.pipelines.detail(pipelineId), {
          ...previousPipeline,
          stages: updatedStages,
        });
      }

      return { previousPipeline };
    },
    onError: (error, { pipelineId }, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(
          queryKeys.pipelines.detail(pipelineId),
          context.previousPipeline
        );
      }
      console.error('Failed to update stage:', error);
      toast.error('فشل في تحديث المرحلة');
    },
    onSettled: (_, __, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.kanban(pipelineId) });
    },
  });
}

/**
 * Hook to delete a stage
 */
export function useDeleteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      pipelinesApi.deleteStage(pipelineId, stageId),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.kanban(pipelineId) });
    },
    onError: (error: Error) => {
      console.error('Failed to delete stage:', error);
      toast.error('فشل في حذف المرحلة');
    },
  });
}

/**
 * Hook to reorder stages in a pipeline (for drag & drop)
 */
export function useReorderStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
      pipelinesApi.reorderStages(pipelineId, stageIds),
    onMutate: async ({ pipelineId, stageIds }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.pipelines.detail(pipelineId)
      });

      const previousPipeline = queryClient.getQueryData<Pipeline>(
        queryKeys.pipelines.detail(pipelineId)
      );

      if (previousPipeline) {
        // Reorder stages optimistically
        const stageMap = new Map(previousPipeline.stages.map((s) => [s.id, s]));
        const reorderedStages = stageIds
          .map((id, index) => {
            const stage = stageMap.get(id);
            return stage ? { ...stage, order: index } : null;
          })
          .filter(Boolean) as PipelineStage[];

        queryClient.setQueryData<Pipeline>(queryKeys.pipelines.detail(pipelineId), {
          ...previousPipeline,
          stages: reorderedStages,
        });
      }

      return { previousPipeline };
    },
    onError: (error, { pipelineId }, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(
          queryKeys.pipelines.detail(pipelineId),
          context.previousPipeline
        );
      }
      console.error('Failed to reorder stages:', error);
      toast.error('فشل في إعادة ترتيب المراحل');
    },
    onSettled: (_, __, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.kanban(pipelineId) });
    },
  });
}
