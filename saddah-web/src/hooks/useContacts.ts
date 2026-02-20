/**
 * useContacts Hook
 * React Query hook for contacts CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactsApi,
  Contact,
  ContactsParams,
  CreateContactDto,
  UpdateContactDto,
} from '@/services/contacts.api';

// Query keys
export const contactsKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactsKeys.all, 'list'] as const,
  list: (params: ContactsParams) => [...contactsKeys.lists(), params] as const,
  details: () => [...contactsKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactsKeys.details(), id] as const,
};

/**
 * Fetch contacts list
 */
export function useContacts(params: ContactsParams = {}) {
  return useQuery({
    queryKey: contactsKeys.list(params),
    queryFn: () => contactsApi.getAll(params),
  });
}

/**
 * Fetch single contact
 */
export function useContact(id: string) {
  return useQuery({
    queryKey: contactsKeys.detail(id),
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
      queryClient.invalidateQueries({ queryKey: contactsKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: contactsKeys.lists() });
      queryClient.setQueryData(
        contactsKeys.detail(updatedContact.id),
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
      queryClient.invalidateQueries({ queryKey: contactsKeys.lists() });
    },
  });
}
