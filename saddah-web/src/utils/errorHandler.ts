// src/utils/errorHandler.ts
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import i18n from '@/i18n';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

/**
 * Extract error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;

    // Check for specific error message from API
    if (data?.message) {
      return data.message;
    }

    if (data?.error) {
      return data.error;
    }

    // Handle validation errors
    if (data?.errors) {
      const firstError = Object.values(data.errors).flat()[0];
      if (firstError) return firstError;
    }

    // Handle HTTP status codes
    switch (error.response?.status) {
      case 400:
        return i18n.t('errors.badRequest', 'طلب غير صالح');
      case 401:
        return i18n.t('errors.unauthorized', 'يرجى تسجيل الدخول');
      case 403:
        return i18n.t('errors.forbidden', 'غير مصرح بهذا الإجراء');
      case 404:
        return i18n.t('errors.notFound', 'العنصر غير موجود');
      case 409:
        return i18n.t('errors.conflict', 'تعارض في البيانات');
      case 422:
        return i18n.t('errors.validationError', 'خطأ في البيانات المدخلة');
      case 429:
        return i18n.t('errors.tooManyRequests', 'طلبات كثيرة، يرجى الانتظار');
      case 500:
        return i18n.t('errors.serverError', 'خطأ في الخادم');
      case 502:
      case 503:
      case 504:
        return i18n.t('errors.serviceUnavailable', 'الخدمة غير متوفرة حالياً');
      default:
        return i18n.t('errors.unknown', 'حدث خطأ غير متوقع');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return i18n.t('errors.unknown', 'حدث خطأ غير متوقع');
}

/**
 * Handle API error and show toast notification
 */
export function handleApiError(error: unknown, customMessage?: string): void {
  const message = customMessage || getErrorMessage(error);
  toast.error(message);
}

/**
 * Handle mutation error for React Query
 */
export function handleMutationError(error: unknown): void {
  handleApiError(error);
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}

/**
 * Check if error is a validation error (422)
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 422;
  }
  return false;
}

/**
 * Get validation errors from API response
 */
export function getValidationErrors(error: unknown): Record<string, string[]> {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.errors || {};
  }
  return {};
}

/**
 * Check if error is a network error (no response)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && error.code !== 'ECONNABORTED';
  }
  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ECONNABORTED';
  }
  return false;
}

/**
 * Global error handler for window errors
 */
export function setupGlobalErrorHandler(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    // Show toast for user-facing errors
    if (event.reason instanceof AxiosError) {
      handleApiError(event.reason);
    }

    // Prevent default browser behavior
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
  });
}
