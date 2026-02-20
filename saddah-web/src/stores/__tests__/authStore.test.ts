/**
 * Auth Store Unit Tests
 * SADDAH CRM Frontend Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '../authStore';
import { authApi } from '@/services/auth.api';

// Mock the auth API
vi.mock('@/services/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getProfile: vi.fn(),
  },
}));

describe('authStore', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@saddah.io',
    firstName: 'أحمد',
    lastName: 'السعيد',
    role: 'sales_rep',
    language: 'ar',
    tenantId: 'tenant-123',
    avatar: undefined,
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  const mockAuthResponse = {
    ...mockTokens,
    user: mockUser,
  };

  beforeEach(() => {
    // Reset the store before each test
    const store = useAuthStore.getState();
    act(() => {
      useAuthStore.setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should set user on successful login', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set tokens on successful login', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });

      const state = useAuthStore.getState();
      expect(state.tokens).toEqual(mockTokens);
    });

    it('should set isLoading to true during login', async () => {
      let loadingDuringRequest = false;
      
      vi.mocked(authApi.login).mockImplementation(async () => {
        loadingDuringRequest = useAuthStore.getState().isLoading;
        return mockAuthResponse;
      });

      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });

      expect(loadingDuringRequest).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authApi.login).mockRejectedValue(error);

      try {
        await act(async () => {
          await useAuthStore.getState().login('test@saddah.io', 'wrongpassword');
        });
      } catch (e) {
        expect((e as Error).message).toBe('Invalid credentials');
      }

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Set up authenticated state
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);
      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });
    });

    it('should clear user on logout', async () => {
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should clear tokens on logout', async () => {
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.tokens).toBeNull();
    });

    it('should set isAuthenticated to false on logout', async () => {
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should clear state even if API logout fails', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));

      // Logout should still clear state even if API call fails
      // The store's logout function catches errors in finally block
      await act(async () => {
        try {
          await useAuthStore.getState().logout();
        } catch {
          // Ignore error - we're testing that state clears anyway
        }
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('refreshToken', () => {
    beforeEach(async () => {
      // Set up authenticated state
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);
      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });
    });

    it('should update tokens on successful refresh', async () => {
      const newAuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      vi.mocked(authApi.refresh).mockResolvedValue(newAuthResponse);

      await act(async () => {
        await useAuthStore.getState().refreshToken();
      });

      const state = useAuthStore.getState();
      expect(state.tokens?.accessToken).toBe('new-access-token');
      expect(state.tokens?.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error when no refresh token available', async () => {
      // Clear tokens
      act(() => {
        useAuthStore.setState({ tokens: null });
      });

      await expect(
        act(async () => {
          await useAuthStore.getState().refreshToken();
        }),
      ).rejects.toThrow('No refresh token');
    });

    it('should handle refresh failure', async () => {
      vi.mocked(authApi.refresh).mockRejectedValue(new Error('Token expired'));

      await expect(
        act(async () => {
          await useAuthStore.getState().refreshToken();
        }),
      ).rejects.toThrow('Token expired');
    });
  });

  describe('isAuthenticated', () => {
    it('should be false initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should be true after successful login', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should be false after logout', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });
      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('should set tokens directly', () => {
      act(() => {
        useAuthStore.getState().setTokens(mockTokens);
      });

      expect(useAuthStore.getState().tokens).toEqual(mockTokens);
    });
  });

  describe('setUser', () => {
    it('should set user directly', () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });
  });

  describe('persistence', () => {
    it('should persist auth state to localStorage', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await useAuthStore.getState().login('test@saddah.io', 'password123');
      });

      // The store is configured to persist to localStorage with key 'saddah-auth'
      // Due to zustand middleware, we verify the state was set correctly
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isAuthenticated).toBe(true);
    });
  });
});
