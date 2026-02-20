import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  getErrorMessage,
  handleApiError,
  isAuthError,
  isValidationError,
  getValidationErrors,
  isNetworkError,
  isTimeoutError,
} from '../errorHandler';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock i18n to return fallback values
vi.mock('@/i18n', () => ({
  default: {
    t: (_key: string, fallback: string) => fallback,
  },
}));

import { toast } from 'sonner';

// Create axios error helper
function createAxiosError(
  status: number,
  data?: any,
  code?: string
): AxiosError {
  const error = new AxiosError('Error');
  error.response = {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  error.code = code;
  return error;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getErrorMessage', () => {
    it('returns message from API response', () => {
      const error = createAxiosError(400, { message: 'Custom error message' });
      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('returns error field from API response', () => {
      const error = createAxiosError(400, { error: 'Error field value' });
      expect(getErrorMessage(error)).toBe('Error field value');
    });

    it('returns first validation error', () => {
      const error = createAxiosError(422, {
        errors: {
          email: ['Invalid email', 'Email is required'],
          name: ['Name is required'],
        },
      });
      expect(getErrorMessage(error)).toBe('Invalid email');
    });

    it('returns appropriate message for 401', () => {
      const error = createAxiosError(401, {});
      expect(getErrorMessage(error)).toContain('تسجيل الدخول');
    });

    it('returns appropriate message for 403', () => {
      const error = createAxiosError(403, {});
      expect(getErrorMessage(error)).toContain('غير مصرح');
    });

    it('returns appropriate message for 404', () => {
      const error = createAxiosError(404, {});
      expect(getErrorMessage(error)).toContain('غير موجود');
    });

    it('returns appropriate message for 500', () => {
      const error = createAxiosError(500, {});
      expect(getErrorMessage(error)).toContain('خطأ في الخادم');
    });

    it('returns appropriate message for 429', () => {
      const error = createAxiosError(429, {});
      expect(getErrorMessage(error)).toContain('طلبات كثيرة');
    });

    it('returns error message for regular Error', () => {
      const error = new Error('Regular error');
      expect(getErrorMessage(error)).toBe('Regular error');
    });

    it('returns default message for unknown error', () => {
      expect(getErrorMessage('string error')).toContain('خطأ غير متوقع');
    });
  });

  describe('handleApiError', () => {
    it('shows toast with error message', () => {
      const error = createAxiosError(400, { message: 'Bad request' });
      handleApiError(error);
      expect(toast.error).toHaveBeenCalledWith('Bad request');
    });

    it('uses custom message when provided', () => {
      const error = createAxiosError(400, { message: 'API error' });
      handleApiError(error, 'Custom message');
      expect(toast.error).toHaveBeenCalledWith('Custom message');
    });
  });

  describe('isAuthError', () => {
    it('returns true for 401 errors', () => {
      const error = createAxiosError(401, {});
      expect(isAuthError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      const error = createAxiosError(403, {});
      expect(isAuthError(error)).toBe(false);
    });

    it('returns false for non-Axios errors', () => {
      expect(isAuthError(new Error('test'))).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('returns true for 422 errors', () => {
      const error = createAxiosError(422, {});
      expect(isValidationError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      const error = createAxiosError(400, {});
      expect(isValidationError(error)).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('returns validation errors from response', () => {
      const error = createAxiosError(422, {
        errors: {
          email: ['Invalid email'],
          name: ['Name required'],
        },
      });
      const errors = getValidationErrors(error);
      expect(errors.email).toContain('Invalid email');
      expect(errors.name).toContain('Name required');
    });

    it('returns empty object when no errors', () => {
      const error = createAxiosError(422, {});
      expect(getValidationErrors(error)).toEqual({});
    });

    it('returns empty object for non-Axios errors', () => {
      expect(getValidationErrors(new Error('test'))).toEqual({});
    });
  });

  describe('isNetworkError', () => {
    it('returns true when no response', () => {
      const error = new AxiosError('Network Error');
      expect(isNetworkError(error)).toBe(true);
    });

    it('returns false when response exists', () => {
      const error = createAxiosError(500, {});
      expect(isNetworkError(error)).toBe(false);
    });

    it('returns false for timeout errors', () => {
      const error = new AxiosError('Timeout');
      error.code = 'ECONNABORTED';
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('returns true for ECONNABORTED code', () => {
      const error = new AxiosError('Timeout');
      error.code = 'ECONNABORTED';
      expect(isTimeoutError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      const error = createAxiosError(500, {});
      expect(isTimeoutError(error)).toBe(false);
    });
  });
});
