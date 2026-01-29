// src/config/env.ts
// Type-safe environment configuration

/**
 * Environment configuration interface
 */
interface EnvConfig {
  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;

  // App Configuration
  appName: string;
  appVersion: string;
  appEnvironment: 'development' | 'staging' | 'production';

  // Feature Flags
  enableMockData: boolean;
  enableDebugMode: boolean;
  enableAnalytics: boolean;

  // External Services
  whatsappApiUrl?: string;
  googleMapsApiKey?: string;
  sentryDsn?: string;

  // WebSocket Configuration
  wsUrl?: string;
  wsReconnectInterval: number;
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  // Vite environment variables are prefixed with VITE_
  return import.meta.env[key] ?? fallback;
}

/**
 * Parse boolean environment variable
 */
function getEnvBool(key: string, fallback: boolean = false): boolean {
  const value = getEnvVar(key);
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse number environment variable
 */
function getEnvNumber(key: string, fallback: number): number {
  const value = getEnvVar(key);
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Environment configuration object
 */
export const env: EnvConfig = {
  // API Configuration
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', '/api/v1'),
  apiTimeout: getEnvNumber('VITE_API_TIMEOUT', 30000),

  // App Configuration
  appName: getEnvVar('VITE_APP_NAME', 'Saddah CRM'),
  appVersion: getEnvVar('VITE_APP_VERSION', '1.0.0'),
  appEnvironment: getEnvVar('VITE_APP_ENVIRONMENT', 'development') as EnvConfig['appEnvironment'],

  // Feature Flags
  enableMockData: getEnvBool('VITE_ENABLE_MOCK_DATA', false),
  enableDebugMode: getEnvBool('VITE_ENABLE_DEBUG_MODE', import.meta.env.DEV),
  enableAnalytics: getEnvBool('VITE_ENABLE_ANALYTICS', false),

  // External Services
  whatsappApiUrl: getEnvVar('VITE_WHATSAPP_API_URL') || undefined,
  googleMapsApiKey: getEnvVar('VITE_GOOGLE_MAPS_API_KEY') || undefined,
  sentryDsn: getEnvVar('VITE_SENTRY_DSN') || undefined,

  // WebSocket Configuration
  wsUrl: getEnvVar('VITE_WS_URL') || undefined,
  wsReconnectInterval: getEnvNumber('VITE_WS_RECONNECT_INTERVAL', 5000),
};

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const requiredInProduction = ['VITE_API_BASE_URL'];

  if (env.appEnvironment === 'production') {
    const missing = requiredInProduction.filter(
      (key) => !import.meta.env[key]
    );

    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing);
    }
  }
}

/**
 * Check if running in development mode
 */
export const isDev = env.appEnvironment === 'development';

/**
 * Check if running in staging mode
 */
export const isStaging = env.appEnvironment === 'staging';

/**
 * Check if running in production mode
 */
export const isProd = env.appEnvironment === 'production';
