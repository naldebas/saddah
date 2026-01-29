import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  contactsApi,
  type Contact,
  type ContactsParams,
  type ContactsResponse,
  type CreateContactDto,
  type UpdateContactDto,
} from '@/services/contacts.api';

/**
 * Hook to fetch paginated contacts list
 */
export function useContacts(params: ContactsParams = {}) {
  return useQuery({
    queryKey: queryKeys.contacts.list(params),
    queryFn: () => contactsApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single contact by ID
 */
export function useContact(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id!),
    queryFn: () => contactsApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactDto) => contactsApi.create(data),
    onSuccess: () => {
      // Invalidate contacts list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
    },
    onError: (error: Error) => {
      console.error('Failed to create contact:', error);
      toast.error('فشل في إنشاء جهة الاتصال');
    },
  });
}

/**
 * Hook to update a contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) =>
      contactsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.detail(id) });

      // Snapshot the previous value
      const previousContact = queryClient.getQueryData<Contact>(
        queryKeys.contacts.detail(id)
      );

      // Optimistically update the cache
      if (previousContact) {
        queryClient.setQueryData<Contact>(queryKeys.contacts.detail(id), {
          ...previousContact,
          ...data,
        });
      }

      return { previousContact };
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousContact) {
        queryClient.setQueryData(
          queryKeys.contacts.detail(id),
          context.previousContact
        );
      }
      console.error('Failed to update contact:', error);
      toast.error('فشل في تحديث جهة الاتصال');
    },
    onSettled: (_, __, { id }) => {
      // Refetch to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
    },
  });
}

/**
 * Hook to delete a contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.contacts.detail(id) });
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
    },
    onError: (error: Error) => {
      console.error('Failed to delete contact:', error);
      toast.error('فشل في حذف جهة الاتصال');
    },
  });
}

/**
 * Hook to prefetch a contact (for hover previews, etc.)
 */
export function usePrefetchContact() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.contacts.detail(id),
      queryFn: () => contactsApi.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}
