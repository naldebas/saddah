// src/config/bull.config.ts
import { registerAs } from '@nestjs/config';

export interface BullConfig {
  redis: {
    host: string;
    port: number;
    password: string;
    tls?: Record<string, unknown>;
    maxRetriesPerRequest?: number | null;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: boolean;
    removeOnFail: boolean;
  };
}

export default registerAs(
  'bull',
  (): BullConfig => {
    // Support Upstash Redis URL (rediss://...) or individual host/port/password
    const redisUrl = process.env.REDIS_URL;
    const useTls = process.env.REDIS_TLS === 'true' || redisUrl?.startsWith('rediss://');

    let host = process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost';
    let port = parseInt(process.env.BULL_REDIS_PORT || process.env.REDIS_PORT || '6379', 10);
    let password = process.env.BULL_REDIS_PASSWORD || process.env.REDIS_PASSWORD || '';

    // Parse Redis URL if provided (Upstash format: rediss://default:PASSWORD@HOST:PORT)
    if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
      try {
        const url = new URL(redisUrl);
        host = url.hostname;
        port = parseInt(url.port || '6379', 10);
        password = url.password || password;
      } catch {
        // Fall back to individual env vars
      }
    }

    return {
      redis: {
        host,
        port,
        password,
        ...(useTls ? { tls: {} } : {}),
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    };
  },
);
