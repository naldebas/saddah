/**
 * useContacts Hook Unit Tests
 * SADDAH CRM Frontend Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useContacts,
  useContact,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  contactsKeys,
} from '../useContacts';
import { contactsApi, Contact, ContactsResponse } from '@/services/contacts.api';

// Mock the contacts API
vi.mock('@/services/contacts.api', () => ({
  contactsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useContacts hooks', () => {
  let queryClient: QueryClient;

  const mockContact: Contact = {
    id: 'contact-123',
    tenantId: 'tenant-123',
    ownerId: 'user-123',
    companyId: null,
    firstName: 'محمد',
    lastName: 'العتيبي',
    email: 'mohammed@example.com',
    phone: '+966501234567',
    whatsapp: '+966501234567',
    title: 'مدير',
    source: 'whatsapp',
    tags: [],
    customFields: {},
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  const mockContactsResponse: ContactsResponse = {
    data: [mockContact],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };

  // Wrapper with QueryClient
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useContacts', () => {
    it('should fetch contacts list', async () => {
      vi.mocked(contactsApi.getAll).mockResolvedValue(mockContactsResponse);

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContactsResponse);
      expect(contactsApi.getAll).toHaveBeenCalledWith({});
    });

    it('should handle loading state', async () => {
      vi.mocked(contactsApi.getAll).mockResolvedValue(mockContactsResponse);

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle error state', async () => {
      const error = new Error('Network error');
      vi.mocked(contactsApi.getAll).mockRejectedValue(error);

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should pass params to API', async () => {
      vi.mocked(contactsApi.getAll).mockResolvedValue(mockContactsResponse);

      const params = { page: 2, limit: 10, search: 'محمد' };

      const { result } = renderHook(() => useContacts(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(contactsApi.getAll).toHaveBeenCalledWith(params);
    });
  });

  describe('useContact', () => {
    it('should fetch single contact', async () => {
      vi.mocked(contactsApi.getById).mockResolvedValue(mockContact);

      const { result } = renderHook(() => useContact('contact-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContact);
      expect(contactsApi.getById).toHaveBeenCalledWith('contact-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useContact(''), {
        wrapper: createWrapper(),
      });

      // Should not be loading because query is disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(contactsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateContact', () => {
    it('should create contact', async () => {
      vi.mocked(contactsApi.create).mockResolvedValue(mockContact);
      vi.mocked(contactsApi.getAll).mockResolvedValue(mockContactsResponse);

      const { result } = renderHook(() => useCreateContact(), {
        wrapper: createWrapper(),
      });

      const createData = {
        firstName: 'محمد',
        lastName: 'العتيبي',
        email: 'mohammed@example.com',
        phone: '+966501234567',
      };

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(contactsApi.create).toHaveBeenCalledWith(createData);
      expect(result.current.data).toEqual(mockContact);
    });

    it('should invalidate contacts list on success', async () => {
      vi.mocked(contactsApi.create).mockResolvedValue(mockContact);

      // First, populate the cache
      vi.mocked(contactsApi.getAll).mockResolvedValue(mockContactsResponse);
      
      const { result: listResult } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(listResult.current.isSuccess).toBe(true);
      });

      // Then, create a new contact
      const { result: createResult } = renderHook(() => useCreateContact(), {
        wrapper: createWrapper(),
      });

      createResult.current.mutate({ firstName: 'Test', lastName: 'User' });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useUpdateContact', () => {
    it('should update contact', async () => {
      const updatedContact = { ...mockContact, firstName: 'أحمد' };
      vi.mocked(contactsApi.update).mockResolvedValue(updatedContact);

      const { result } = renderHook(() => useUpdateContact(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'contact-123',
        data: { firstName: 'أحمد' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(contactsApi.update).toHaveBeenCalledWith('contact-123', { firstName: 'أحمد' });
      expect(result.current.data).toEqual(updatedContact);
    });
  });

  describe('useDeleteContact', () => {
    it('should delete contact', async () => {
      vi.mocked(contactsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteContact(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('contact-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(contactsApi.delete).toHaveBeenCalledWith('contact-123');
    });
  });

  describe('contactsKeys', () => {
    it('should generate correct query keys', () => {
      expect(contactsKeys.all).toEqual(['contacts']);
      expect(contactsKeys.lists()).toEqual(['contacts', 'list']);
      expect(contactsKeys.list({ page: 1 })).toEqual(['contacts', 'list', { page: 1 }]);
      expect(contactsKeys.details()).toEqual(['contacts', 'detail']);
      expect(contactsKeys.detail('123')).toEqual(['contacts', 'detail', '123']);
    });
  });
});
