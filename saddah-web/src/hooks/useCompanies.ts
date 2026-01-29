import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  companiesApi,
  type Company,
  type CompaniesParams,
  type CreateCompanyDto,
  type UpdateCompanyDto,
} from '@/services/companies.api';

/**
 * Hook to fetch paginated companies list
 */
export function useCompanies(params: CompaniesParams = {}) {
  return useQuery({
    queryKey: queryKeys.companies.list(params),
    queryFn: () => companiesApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single company by ID
 */
export function useCompany(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.companies.detail(id!),
    queryFn: () => companiesApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch available industries for filtering
 */
export function useIndustries() {
  return useQuery({
    queryKey: queryKeys.companies.industries(),
    queryFn: () => companiesApi.getIndustries(),
    staleTime: 1000 * 60 * 30, // 30 minutes - industries don't change often
  });
}

/**
 * Hook to fetch available cities for filtering
 */
export function useCities() {
  return useQuery({
    queryKey: queryKeys.companies.cities(),
    queryFn: () => companiesApi.getCities(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to create a new company
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyDto) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      // Invalidate industries and cities in case new ones were added
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.industries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.cities() });
    },
    onError: (error: Error) => {
      console.error('Failed to create company:', error);
      toast.error('فشل في إنشاء الشركة');
    },
  });
}

/**
 * Hook to update a company
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyDto }) =>
      companiesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.detail(id) });

      const previousCompany = queryClient.getQueryData<Company>(
        queryKeys.companies.detail(id)
      );

      if (previousCompany) {
        queryClient.setQueryData<Company>(queryKeys.companies.detail(id), {
          ...previousCompany,
          ...data,
        });
      }

      return { previousCompany };
    },
    onError: (error, { id }, context) => {
      if (context?.previousCompany) {
        queryClient.setQueryData(
          queryKeys.companies.detail(id),
          context.previousCompany
        );
      }
      console.error('Failed to update company:', error);
      toast.error('فشل في تحديث الشركة');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.industries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.cities() });
    },
  });
}

/**
 * Hook to delete a company
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.companies.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
    },
    onError: (error: Error) => {
      console.error('Failed to delete company:', error);
      toast.error('فشل في حذف الشركة');
    },
  });
}

/**
 * Hook to prefetch a company (for hover previews, etc.)
 */
export function usePrefetchCompany() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.companies.detail(id),
      queryFn: () => companiesApi.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}
