import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  leadsApi,
  type Lead,
  type LeadStatistics,
  type QueryLeadsParams,
  type CreateLeadDto,
  type UpdateLeadDto,
  type ConvertLeadDto,
  type ScoreLeadDto,
} from '@/services/leads.api';

/**
 * Hook to fetch paginated leads list
 */
export function useLeads(params: QueryLeadsParams = {}) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => leadsApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single lead by ID
 */
export function useLead(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id!),
    queryFn: () => leadsApi.getOne(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch lead statistics
 */
export function useLeadStatistics() {
  return useQuery({
    queryKey: queryKeys.leads.statistics(),
    queryFn: () => leadsApi.getStatistics(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadDto) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onError: (error: Error) => {
      console.error('Failed to create lead:', error);
      toast.error('فشل في إنشاء العميل المحتمل');
    },
  });
}

/**
 * Hook to update a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadDto }) =>
      leadsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.detail(id) });

      const previousLead = queryClient.getQueryData<Lead>(
        queryKeys.leads.detail(id)
      );

      if (previousLead) {
        queryClient.setQueryData<Lead>(queryKeys.leads.detail(id), {
          ...previousLead,
          ...data,
        });
      }

      return { previousLead };
    },
    onError: (error, { id }, context) => {
      if (context?.previousLead) {
        queryClient.setQueryData(
          queryKeys.leads.detail(id),
          context.previousLead
        );
      }
      console.error('Failed to update lead:', error);
      toast.error('فشل في تحديث العميل المحتمل');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics() });
    },
  });
}

/**
 * Hook to update lead status
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      leadsApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.detail(id) });

      const previousLead = queryClient.getQueryData<Lead>(
        queryKeys.leads.detail(id)
      );

      if (previousLead) {
        queryClient.setQueryData<Lead>(queryKeys.leads.detail(id), {
          ...previousLead,
          status,
        });
      }

      return { previousLead };
    },
    onError: (error, { id }, context) => {
      if (context?.previousLead) {
        queryClient.setQueryData(
          queryKeys.leads.detail(id),
          context.previousLead
        );
      }
      console.error('Failed to update lead status:', error);
      toast.error('فشل في تحديث حالة العميل');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics() });
    },
  });
}

/**
 * Hook to score a lead
 */
export function useScoreLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScoreLeadDto }) =>
      leadsApi.score(id, data),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(
        queryKeys.leads.detail(updatedLead.id),
        updatedLead
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics() });
    },
    onError: (error: Error) => {
      console.error('Failed to score lead:', error);
      toast.error('فشل في تقييم العميل المحتمل');
    },
  });
}

/**
 * Hook to convert a lead to a contact (and optionally a deal)
 */
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertLeadDto }) =>
      leadsApi.convert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onError: (error: Error) => {
      console.error('Failed to convert lead:', error);
      toast.error('فشل في تحويل العميل المحتمل');
    },
  });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics() });
    },
    onError: (error: Error) => {
      console.error('Failed to delete lead:', error);
      toast.error('فشل في حذف العميل المحتمل');
    },
  });
}
