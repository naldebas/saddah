/**
 * Vercel Serverless Function Entry Point
 * Wraps NestJS application for serverless deployment
 */
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from '../src/app.module';

const server = express();
let app: any;

async function bootstrap() {
  if (!app) {
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      rawBody: true,
      logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn'],
    });

    // Security
    nestApp.use(helmet());

    // CORS
    const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
    nestApp.enableCors({
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    });

    // Global prefix
    nestApp.setGlobalPrefix('api');

    // API versioning
    nestApp.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    // Validation
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await nestApp.init();
    app = nestApp;
  }
  return server;
}

export default async (req: any, res: any) => {
  const handler = await bootstrap();
  handler(req, res);
};
