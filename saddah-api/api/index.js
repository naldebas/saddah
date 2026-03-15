/**
 * Vercel Serverless Function Entry Point
 * Imports from pre-built dist/ to avoid TypeScript path alias issues
 */
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe, VersioningType } = require('@nestjs/common');
const helmet = require('helmet');
const express = require('express');
const { AppModule } = require('../dist/app.module');

const server = express();
let app;

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

module.exports = async (req, res) => {
  const handler = await bootstrap();
  handler(req, res);
};
