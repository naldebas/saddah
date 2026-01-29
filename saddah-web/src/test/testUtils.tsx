// src/test/testUtils.tsx
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Create a new QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components with all providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };

// Export query client creator for tests that need direct access
export { createTestQueryClient };

/**
 * Helper to wait for async operations
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Helper to create mock API responses
 */
export function createMockApiResponse<T>(data: T, meta?: { total: number; page: number; limit: number; totalPages: number }) {
  return {
    data,
    meta: meta || {
      total: Array.isArray(data) ? data.length : 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };
}

/**
 * Helper to create mock user
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    language: 'ar',
    tenantId: 'tenant-1',
    ...overrides,
  };
}

/**
 * Helper to create mock contact
 */
export function createMockContact(overrides = {}) {
  return {
    id: 'contact-1',
    firstName: 'محمد',
    lastName: 'العتيبي',
    email: 'mohammed@example.com',
    phone: '+966551234567',
    source: 'manual',
    tags: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
    },
    ...overrides,
  };
}

/**
 * Helper to create mock lead
 */
export function createMockLead(overrides = {}) {
  return {
    id: 'lead-1',
    firstName: 'أحمد',
    lastName: 'السعيد',
    email: 'ahmed@example.com',
    phone: '+966559876543',
    source: 'whatsapp_bot',
    status: 'new',
    score: 75,
    scoreGrade: 'B',
    propertyType: 'villa',
    budget: 1500000,
    location: 'الرياض',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create mock deal
 */
export function createMockDeal(overrides = {}) {
  return {
    id: 'deal-1',
    title: 'صفقة فيلا شمال الرياض',
    value: 2500000,
    currency: 'SAR',
    status: 'open',
    probability: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
    },
    stage: {
      id: 'stage-1',
      name: 'تفاوض',
      order: 2,
    },
    ...overrides,
  };
}

/**
 * Helper to create mock notification
 */
export function createMockNotification(overrides = {}) {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'new_lead',
    title: 'عميل محتمل جديد',
    message: 'تم إضافة عميل محتمل جديد',
    data: {},
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
