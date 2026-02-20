/**
 * Test Helpers - Shared test utilities and helper functions
 * SADDAH CRM Test Utilities
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// ============================================
// JWT HELPERS
// ============================================

/**
 * Create a mock JWT service
 */
export const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id', tenantId: 'tenant-id', email: 'test@saddah.io' }),
  verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id', tenantId: 'tenant-id', email: 'test@saddah.io' }),
  decode: jest.fn().mockReturnValue({ sub: 'user-id', tenantId: 'tenant-id' }),
});

/**
 * Create a mock ConfigService
 */
export const createMockConfigService = (config: Record<string, unknown> = {}) => ({
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const defaultConfig: Record<string, unknown> = {
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
      JWT_EXPIRES_IN: '1h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'test-openai-key',
      OPENAI_MODEL: 'gpt-4-turbo',
      ...config,
    };
    return defaultConfig[key] ?? defaultValue;
  }),
  getOrThrow: jest.fn((key: string) => {
    const defaultConfig: Record<string, unknown> = {
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
      ...config,
    };
    const value = defaultConfig[key];
    if (value === undefined) {
      throw new Error(`Config key ${key} not found`);
    }
    return value;
  }),
});

// ============================================
// PASSWORD HELPERS
// ============================================

/**
 * Hash a password for testing
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

/**
 * Create a pre-hashed password for common test scenarios
 */
export const TEST_PASSWORD = 'TestPassword@123';
export const TEST_PASSWORD_HASH = '$2b$10$K8sVJOv8aQSJ9Hv2Y8GQDe8z.b2YRoMbJx3Vd6Y4VU9cKq1Z5m3Cu';

// ============================================
// DATE HELPERS
// ============================================

/**
 * Create a date relative to now
 */
export const relativeDate = (days: number, hours = 0, minutes = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

/**
 * Get start of today
 */
export const startOfToday = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Get end of today
 */
export const endOfToday = (): Date => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Get a date in the past
 */
export const pastDate = (days: number): Date => relativeDate(-days);

/**
 * Get a date in the future
 */
export const futureDate = (days: number): Date => relativeDate(days);

// ============================================
// TEST MODULE HELPERS
// ============================================

/**
 * Create a testing module with common providers
 */
export const createTestingModule = async (
  metadata: ModuleMetadata,
  additionalProviders: any[] = [],
): Promise<TestingModule> => {
  return Test.createTestingModule({
    ...metadata,
    providers: [
      ...(metadata.providers || []),
      ...additionalProviders,
    ],
  }).compile();
};

/**
 * Setup common test providers for service tests
 */
export interface CommonTestProviders {
  jwtService: ReturnType<typeof createMockJwtService>;
  configService: ReturnType<typeof createMockConfigService>;
}

export const createCommonTestProviders = (configOverrides?: Record<string, unknown>): CommonTestProviders => ({
  jwtService: createMockJwtService(),
  configService: createMockConfigService(configOverrides),
});

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Create a paginated response
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page = 1,
  limit = 20,
  total?: number,
) => ({
  data,
  meta: {
    total: total ?? data.length,
    page,
    limit,
    totalPages: Math.ceil((total ?? data.length) / limit),
  },
});

/**
 * Verify pagination metadata
 */
export const expectPaginatedResponse = (response: any, expectedTotal: number, page = 1, limit = 20) => {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('meta');
  expect(response.meta).toMatchObject({
    total: expectedTotal,
    page,
    limit,
    totalPages: Math.ceil(expectedTotal / limit),
  });
};

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a function throws a specific error type
 */
export const expectToThrow = async <T extends Error>(
  fn: () => Promise<any>,
  errorType: new (...args: any[]) => T,
): Promise<void> => {
  await expect(fn()).rejects.toThrow(errorType);
};

/**
 * Assert that an object has specific properties
 */
export const expectProperties = (obj: any, properties: string[]): void => {
  properties.forEach((prop) => {
    expect(obj).toHaveProperty(prop);
  });
};

/**
 * Assert that dates are approximately equal (within 1 second)
 */
export const expectDatesApproximatelyEqual = (date1: Date, date2: Date, toleranceMs = 1000): void => {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  expect(diff).toBeLessThanOrEqual(toleranceMs);
};

// ============================================
// MOCK RESPONSE HELPERS
// ============================================

/**
 * Create a successful async mock response
 */
export const mockResolvedValue = <T>(value: T) => jest.fn().mockResolvedValue(value);

/**
 * Create a failing async mock response
 */
export const mockRejectedValue = (error: Error) => jest.fn().mockRejectedValue(error);

/**
 * Create a mock that returns different values on subsequent calls
 */
export const mockResolvedValueOnce = <T>(...values: T[]) => {
  const mock = jest.fn();
  values.forEach((value) => mock.mockResolvedValueOnce(value));
  return mock;
};

// ============================================
// UUID HELPERS
// ============================================

/**
 * Generate a valid UUID v4 pattern for testing
 */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export const isValidUUID = (str: string): boolean => UUID_PATTERN.test(str);

/**
 * Assert that a string is a valid UUID
 */
export const expectValidUUID = (str: string): void => {
  expect(str).toMatch(UUID_PATTERN);
};

// ============================================
// ARABIC TEXT HELPERS
// ============================================

/**
 * Common Arabic test strings
 */
export const ARABIC_TEST_STRINGS = {
  greeting: 'مرحبا',
  name: 'محمد الأحمد',
  email: 'user@example.com',
  phone: '+966501234567',
  city: 'الرياض',
  propertyType: 'فيلا',
  error_not_found: 'غير موجود',
  error_invalid: 'غير صالح',
};

/**
 * Check if a string contains Arabic characters
 */
export const containsArabic = (str: string): boolean => /[\u0600-\u06FF]/.test(str);

// ============================================
// WAIT/DELAY HELPERS
// ============================================

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};

// ============================================
// CLEAN UP HELPERS
// ============================================

/**
 * Clear all jest mocks
 */
export const clearAllMocks = (): void => {
  jest.clearAllMocks();
};

/**
 * Reset all jest mocks
 */
export const resetAllMocks = (): void => {
  jest.resetAllMocks();
};

/**
 * Restore all jest mocks
 */
export const restoreAllMocks = (): void => {
  jest.restoreAllMocks();
};
