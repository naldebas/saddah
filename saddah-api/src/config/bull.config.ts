// src/config/bull.config.ts
import { registerAs } from '@nestjs/config';

export interface BullConfig {
  redis: {
    host: string;
    port: number;
    password: string;
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
  (): BullConfig => ({
    redis: {
      host: process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.BULL_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
      password: process.env.BULL_REDIS_PASSWORD || process.env.REDIS_PASSWORD || '',
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
  }),
);
