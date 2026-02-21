/**
 * useContacts Hook
 * React Query hook for contacts CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactsApi,
  ContactsParams,
  CreateContactDto,
  UpdateContactDto,
} from '@/services/contacts.api';
import { queryKeys } from './queryKeys';

// Re-export for backwards compatibility
export const contactsKeys = queryKeys.contacts;

/**
 * Fetch contacts list
 */
export function useContacts(params: ContactsParams = {}) {
  return useQuery({
    queryKey: queryKeys.contacts.list(params),
    queryFn: () => contactsApi.getAll(params),
  });
}

/**
 * Fetch single contact
 */
export function useContact(id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => contactsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Create contact mutation
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactDto) => contactsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
    },
  });
}

/**
 * Update contact mutation
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) =>
      contactsApi.update(id, data),
    onSuccess: (updatedContact) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
      queryClient.setQueryData(
        queryKeys.contacts.detail(updatedContact.id),
        updatedContact,
      );
    },
  });
}

/**
 * Delete contact mutation
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
    },
  });
}

/**
 * Prefetch contact for faster navigation
 */
export function usePrefetchContact() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.contacts.detail(id),
      queryFn: () => contactsApi.getById(id),
    });
  };
}
