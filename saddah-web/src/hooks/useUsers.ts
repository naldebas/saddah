import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  userApi,
  type User,
  type QueryUsersParams,
  type CreateUserDto,
  type UpdateUserDto,
} from '@/services/user.api';

/**
 * Hook to fetch users list with optional filtering
 */
export function useUsers(params: QueryUsersParams = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => userApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(id!),
    queryFn: () => userApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success('تم إضافة المستخدم بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to create user:', error);
      toast.error('فشل في إضافة المستخدم');
    },
  });
}

/**
 * Hook to update a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      userApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) });

      const previousUser = queryClient.getQueryData<User>(
        queryKeys.users.detail(id)
      );

      if (previousUser) {
        queryClient.setQueryData<User>(queryKeys.users.detail(id), {
          ...previousUser,
          ...data,
        });
      }

      return { previousUser };
    },
    onError: (error, { id }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(
          queryKeys.users.detail(id),
          context.previousUser
        );
      }
      console.error('Failed to update user:', error);
      toast.error('فشل في تحديث المستخدم');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

/**
 * Hook to delete a user (soft delete)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success('تم حذف المستخدم بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to delete user:', error);
      toast.error('فشل في حذف المستخدم');
    },
  });
}
