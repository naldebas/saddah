import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  projectsApi,
  type Project,
  type QueryProjectsParams,
  type CreateProjectDto,
  type UpdateProjectDto,
} from '@/services/projects.api';

/**
 * Hook to fetch paginated projects list
 */
export function useProjects(params: QueryProjectsParams = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectsApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single project by ID
 */
export function useProject(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id!),
    queryFn: () => projectsApi.getOne(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch project statistics
 */
export function useProjectStatistics() {
  return useQuery({
    queryKey: queryKeys.projects.statistics(),
    queryFn: () => projectsApi.getStatistics(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch available cities
 */
export function useProjectCities() {
  return useQuery({
    queryKey: queryKeys.projects.cities(),
    queryFn: () => projectsApi.getCities(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.statistics() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.cities() });
      toast.success('تم إنشاء المشروع بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to create project:', error);
      toast.error('فشل في إنشاء المشروع');
    },
  });
}

/**
 * Hook to update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      projectsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(id) });

      const previousProject = queryClient.getQueryData<Project>(
        queryKeys.projects.detail(id)
      );

      if (previousProject) {
        queryClient.setQueryData<Project>(queryKeys.projects.detail(id), {
          ...previousProject,
          ...data,
        });
      }

      return { previousProject };
    },
    onError: (error, { id }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          queryKeys.projects.detail(id),
          context.previousProject
        );
      }
      console.error('Failed to update project:', error);
      toast.error('فشل في تحديث المشروع');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.statistics() });
    },
    onSuccess: () => {
      toast.success('تم تحديث المشروع بنجاح');
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.statistics() });
      toast.success('تم حذف المشروع بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to delete project:', error);
      toast.error('فشل في حذف المشروع');
    },
  });
}
