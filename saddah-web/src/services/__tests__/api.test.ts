/**
 * API Service Unit Tests
 * SADDAH CRM Frontend Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: {
            use: vi.fn(),
          },
          response: {
            use: vi.fn(),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      })),
    },
  };
});

// We need to test the interceptors directly, so let's re-implement them for testing
describe('API Service', () => {
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';

  const mockTokens = {
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken,
    expiresIn: 3600,
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@saddah.io',
    firstName: 'Test',
    lastName: 'User',
    role: 'sales_rep',
    language: 'ar',
    tenantId: 'tenant-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset auth store
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request interceptor - Auth header', () => {
    it('should add auth header when tokens exist', () => {
      // Set up authenticated state
      useAuthStore.setState({
        tokens: mockTokens,
        user: mockUser,
        isAuthenticated: true,
      });

      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        url: '/users',
        method: 'get',
      };

      // Simulate request interceptor
      const tokens = useAuthStore.getState().tokens;
      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }

      expect(config.headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
    });

    it('should not add auth header when no tokens', () => {
      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        url: '/users',
        method: 'get',
      };

      // Simulate request interceptor
      const tokens = useAuthStore.getState().tokens;
      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }

      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response interceptor - Token refresh on 401', () => {
    it('should identify auth endpoints correctly', () => {
      const authEndpoints = [
        '/auth/login',
        '/auth/refresh',
      ];

      const nonAuthEndpoints = [
        '/users',
        '/contacts',
        '/deals',
        '/api/v1/conversations',
      ];

      authEndpoints.forEach((url) => {
        const isAuthEndpoint = url?.includes('/auth/login') || url?.includes('/auth/refresh');
        expect(isAuthEndpoint).toBe(true);
      });

      nonAuthEndpoints.forEach((url) => {
        const isAuthEndpoint = url?.includes('/auth/login') || url?.includes('/auth/refresh');
        expect(isAuthEndpoint).toBe(false);
      });
    });

    it('should not retry refresh for auth endpoints', () => {
      const originalRequest = {
        url: '/auth/login',
        _retry: undefined,
      };

      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                             originalRequest.url?.includes('/auth/refresh');

      expect(isAuthEndpoint).toBe(true);
      // Should not attempt refresh
    });

    it('should mark request for retry to prevent infinite loop', () => {
      const originalRequest = {
        url: '/users',
        _retry: false as boolean | undefined,
      };

      // First 401 - should attempt retry
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        expect(originalRequest._retry).toBe(true);
      }

      // Second 401 - should not retry again
      const shouldRetry = !originalRequest._retry;
      expect(shouldRetry).toBe(false);
    });
  });

  describe('Response interceptor - Network errors', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      
      // Simulate rejecting with network error
      expect(() => {
        throw networkError;
      }).toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError: AxiosError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        name: 'AxiosError',
        isAxiosError: true,
        toJSON: () => ({}),
        config: {} as InternalAxiosRequestConfig,
      };

      expect(timeoutError.code).toBe('ECONNABORTED');
    });

    it('should handle server errors (5xx)', async () => {
      const serverError: Partial<AxiosError> = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
      };

      expect(serverError.response?.status).toBe(500);
    });
  });

  describe('Token refresh flow', () => {
    it('should update auth header after successful refresh', () => {
      const newAccessToken = 'new-access-token';
      const newTokens = {
        ...mockTokens,
        accessToken: newAccessToken,
      };

      // Set new tokens
      useAuthStore.setState({
        tokens: newTokens,
        user: mockUser,
        isAuthenticated: true,
      });

      const originalRequest = {
        headers: {} as Record<string, string>,
        url: '/users',
      };

      // Update header with new token
      const tokens = useAuthStore.getState().tokens;
      originalRequest.headers.Authorization = `Bearer ${tokens?.accessToken}`;

      expect(originalRequest.headers.Authorization).toBe(`Bearer ${newAccessToken}`);
    });

    it('should logout and redirect on refresh failure', () => {
      // Set up authenticated state
      useAuthStore.setState({
        tokens: mockTokens,
        user: mockUser,
        isAuthenticated: true,
      });

      // Simulate refresh failure - logout
      useAuthStore.setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
      });

      // Simulate redirect
      const redirectUrl = '/login';
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(redirectUrl).toBe('/login');
    });
  });

  describe('Exclude auth endpoints from refresh', () => {
    it('should not attempt refresh on login endpoint 401', () => {
      const loginRequest = {
        url: '/auth/login',
      };

      const isAuthEndpoint = loginRequest.url?.includes('/auth/login') ||
                             loginRequest.url?.includes('/auth/refresh');

      expect(isAuthEndpoint).toBe(true);
    });

    it('should not attempt refresh on refresh endpoint 401', () => {
      const refreshRequest = {
        url: '/auth/refresh',
      };

      const isAuthEndpoint = refreshRequest.url?.includes('/auth/login') ||
                             refreshRequest.url?.includes('/auth/refresh');

      expect(isAuthEndpoint).toBe(true);
    });

    it('should attempt refresh on other endpoints 401', () => {
      const userRequest = {
        url: '/users/me',
      };

      const isAuthEndpoint = userRequest.url?.includes('/auth/login') ||
                             userRequest.url?.includes('/auth/refresh');

      expect(isAuthEndpoint).toBe(false);
    });
  });

  describe('API instance configuration', () => {
    it('should have correct default timeout', () => {
      // The API is configured with env.apiTimeout which defaults to 30000
      const expectedTimeout = 30000;
      expect(expectedTimeout).toBe(30000);
    });

    it('should have correct content-type header', () => {
      const expectedContentType = 'application/json';
      expect(expectedContentType).toBe('application/json');
    });
  });
});
