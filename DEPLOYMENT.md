# Saddah CRM - Vercel + Supabase Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   saddah-web    │────▶│     saddah-api        │────▶│    Supabase     │
│   (Vercel SPA)  │     │  (Vercel Serverless)  │     │  (PostgreSQL)   │
│                 │     │                        │     │                 │
│  React + Vite   │     │  NestJS Functions      │     │  Connection     │
│  Static Hosting │     │  + Vercel Cron         │     │  Pooling (6543) │
└─────────────────┘     └──────────┬─────────────┘     └─────────────────┘
                                   │
                        ┌──────────▼─────────────┐
                        │    Upstash Redis       │
                        │  (Bull Queue + Cache)  │
                        └────────────────────────┘
```

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- [Supabase](https://supabase.com) account
- [Upstash](https://upstash.com) account (for Redis)
- Node.js 18+

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose region: **Central EU (Frankfurt)** or **Middle East (Bahrain)** for Saudi Arabia
3. Set a strong database password
4. Wait for project to be provisioned

### 1.2 Get Connection Strings
From your Supabase dashboard → **Settings → Database → Connection string**:

- **Transaction mode (port 6543)** — use for `DATABASE_URL` (pooled, for application queries)
  ```
  postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

- **Session mode (port 5432)** — use for `DIRECT_URL` (direct, for migrations)
  ```
  postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
  ```

### 1.3 Run Database Migrations
```bash
cd saddah-api

# Set environment variables
export DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Generate Prisma client
npx prisma generate

# Deploy migrations to Supabase
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 1.4 Verify Database
```bash
npx prisma studio
```
This opens a browser GUI to inspect your Supabase database tables.

---

## Step 2: Set Up Upstash Redis

### 2.1 Create Redis Database
1. Go to [upstash.com](https://upstash.com) → Create Database
2. Choose region close to your Supabase project
3. Enable TLS (default)

### 2.2 Get Connection Details
From Upstash dashboard, copy:
- **REDIS_URL**: `rediss://default:[PASSWORD]@[HOST]:[PORT]`
- Or individual values: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

---

## Step 3: Deploy saddah-api to Vercel

### 3.1 Deploy
```bash
cd saddah-api

# Login to Vercel
vercel login

# Deploy (first time - creates project)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: saddah-api
# - Directory: ./
```

### 3.2 Set Environment Variables
```bash
# Database (Supabase)
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Redis (Upstash)
vercel env add REDIS_URL production
vercel env add REDIS_TLS production  # Set to: true

# JWT Secrets
vercel env add JWT_SECRET production
vercel env add JWT_EXPIRES_IN production         # e.g., 1h
vercel env add JWT_REFRESH_SECRET production
vercel env add JWT_REFRESH_EXPIRES_IN production # e.g., 7d

# CORS (set to your frontend Vercel URL)
vercel env add CORS_ORIGINS production  # e.g., https://saddah.vercel.app

# OpenAI
vercel env add OPENAI_API_KEY production

# WhatsApp (if using)
vercel env add WHATSAPP_PROVIDER production
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_WHATSAPP_NUMBER production

# Cron Secret (generate a random string)
vercel env add CRON_SECRET production

# Swagger
vercel env add SWAGGER_ENABLED production  # true or false
```

### 3.3 Deploy to Production
```bash
vercel --prod
```

### 3.4 Note Your API URL
After deployment, note the URL (e.g., `https://saddah-api.vercel.app`).
You'll need this for the frontend configuration.

---

## Step 4: Deploy saddah-web to Vercel

### 4.1 Deploy
```bash
cd saddah-web

vercel

# Follow prompts:
# - Project name: saddah-web (or saddah)
# - Framework: Vite
```

### 4.2 Set Environment Variables
```bash
# API Backend URL (from Step 3.4)
vercel env add VITE_API_BACKEND_URL production  # e.g., https://saddah-api.vercel.app

# App Config
vercel env add VITE_API_BASE_URL production     # /api/v1
vercel env add VITE_APP_ENVIRONMENT production  # production
vercel env add VITE_APP_NAME production         # Saddah CRM
```

### 4.3 Deploy to Production
```bash
vercel --prod
```

---

## Step 5: Custom Domain (Optional)

### For Frontend (saddah-web):
```bash
vercel domains add app.saddah.io --project saddah-web
```

### For API (saddah-api):
```bash
vercel domains add api.saddah.io --project saddah-api
```

Update `CORS_ORIGINS` in saddah-api env vars to include the custom domain.

---

## Step 6: Update Botpress Webhook URL

If using Botpress bot, update the webhook URL in the bot's sendToSaddah code:
```
Old: https://saddah-production.up.railway.app/api/v1/webhooks/botpress/...
New: https://api.saddah.io/api/v1/webhooks/botpress/...
     (or https://saddah-api.vercel.app/api/v1/webhooks/botpress/...)
```

---

## Environment Variables Reference

### saddah-api (Vercel Serverless)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://...6543/postgres?pgbouncer=true` | Supabase pooled connection |
| `DIRECT_URL` | Yes | `postgresql://...5432/postgres` | Supabase direct connection (migrations) |
| `REDIS_URL` | Yes | `rediss://default:xxx@xxx.upstash.io:6379` | Upstash Redis URL |
| `REDIS_TLS` | Yes | `true` | Enable TLS for Redis |
| `JWT_SECRET` | Yes | (random 64-char string) | JWT signing secret |
| `JWT_EXPIRES_IN` | Yes | `1h` | Access token expiry |
| `JWT_REFRESH_SECRET` | Yes | (random 64-char string) | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | Yes | `7d` | Refresh token expiry |
| `CORS_ORIGINS` | Yes | `https://saddah.vercel.app` | Comma-separated origins |
| `OPENAI_API_KEY` | No | `sk-...` | For AI features |
| `CRON_SECRET` | Yes | (random string) | Protects cron endpoints |
| `SWAGGER_ENABLED` | No | `true` | Enable Swagger docs |
| `NODE_ENV` | Auto | `production` | Set by Vercel |

### saddah-web (Vercel Static)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_BACKEND_URL` | Yes | `https://saddah-api.vercel.app` | Backend API URL (for rewrites) |
| `VITE_API_BASE_URL` | Yes | `/api/v1` | API base path |
| `VITE_APP_ENVIRONMENT` | No | `production` | App environment |
| `VITE_APP_NAME` | No | `Saddah CRM` | App display name |

---

## Monitoring & Logs

- **Vercel Dashboard**: View function invocations, errors, and logs
- **Supabase Dashboard**: Monitor database queries, connections, and storage
- **Upstash Dashboard**: Monitor Redis operations and memory usage

---

## Troubleshooting

### Cold Starts
Vercel serverless functions may have cold starts (1-3 seconds on first request). This is normal.
To minimize: keep functions warm with a health check ping from an external monitor.

### Database Connection Limits
Supabase free tier: 60 connections. Use the pooled connection string (`port 6543`) for the app.
Direct connection (`port 5432`) should only be used for migrations.

### WebSocket Limitation
Vercel serverless does NOT support persistent WebSocket connections.
For real-time features, consider:
- Supabase Realtime (built-in)
- Ably or Pusher
- Server-Sent Events (SSE) with streaming

### Function Timeout
- Hobby plan: 10 seconds max
- Pro plan: 60 seconds max
Ensure API endpoints respond within these limits.

---

## Migration from Railway

### Data Migration
```bash
# 1. Export from Railway PostgreSQL
pg_dump "RAILWAY_DATABASE_URL" > saddah_backup.sql

# 2. Import to Supabase
psql "SUPABASE_DIRECT_URL" < saddah_backup.sql

# Or use Prisma migrate
cd saddah-api
export DATABASE_URL="SUPABASE_POOLED_URL"
export DIRECT_URL="SUPABASE_DIRECT_URL"
npx prisma migrate deploy
npx prisma db seed  # Only if starting fresh
```

### DNS Cutover
1. Deploy to Vercel and verify everything works
2. Update DNS records to point to Vercel
3. Update webhook URLs (Botpress, WhatsApp)
4. Decommission Railway services
