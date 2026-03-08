# Saddah CRM - Railway Deployment Guide (Testing Environment)

## Architecture Overview

```
Railway Project: saddah-testing
├── saddah-api        (NestJS backend)     → https://saddah-api-testing.up.railway.app
├── saddah-web        (React frontend)     → https://saddah-testing.up.railway.app
├── PostgreSQL        (Railway add-on)     → Internal: postgresql://...
└── Redis             (Railway add-on)     → Internal: redis://...
```

---

## Step-by-Step Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Empty Project"**
3. Name it: `saddah-testing`

### 2. Add Database Services

#### PostgreSQL
1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway auto-provisions and sets `DATABASE_URL`

#### Redis
1. Click **"+ New"** → **"Database"** → **"Add Redis"**
2. Railway auto-provisions and sets `REDIS_URL`

### 3. Deploy Backend (saddah-api)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the Saddah repo
3. Railway will detect the monorepo. Configure:
   - **Root Directory:** `saddah-api`
   - **Dockerfile Path:** `Dockerfile.railway`
4. Set the service name to `saddah-api`

#### Backend Environment Variables

Go to the `saddah-api` service → **Variables** tab and set:

```env
# ---- Auto-provided by Railway add-ons (DO NOT set manually) ----
# DATABASE_URL    → linked from PostgreSQL service
# REDIS_URL       → linked from Redis service

# ---- Application ----
NODE_ENV=production
PORT=3000
API_PREFIX=api

# ---- Redis (from Railway Redis add-on reference) ----
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}

# ---- JWT Secrets (generate unique values!) ----
JWT_SECRET=<generate-a-strong-secret-here>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<generate-another-strong-secret-here>
JWT_REFRESH_EXPIRES_IN=7d

# ---- Rate Limiting ----
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# ---- CORS (will be set after frontend deploys) ----
CORS_ORIGINS=https://<your-saddah-web-url>.up.railway.app

# ---- Swagger (enable for testing) ----
SWAGGER_ENABLED=true

# ---- OpenAI (optional for testing) ----
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo
OPENAI_FALLBACK_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
OPENAI_TIMEOUT=30000

# ---- WhatsApp (optional, leave empty to disable) ----
WHATSAPP_PROVIDER=twilio
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_SKIP_SIGNATURE_VERIFICATION=true
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# ---- Bull Queue (uses same Redis) ----
BULL_REDIS_HOST=${{Redis.REDISHOST}}
BULL_REDIS_PORT=${{Redis.REDISPORT}}
BULL_REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
```

> **Tip:** Use `${{PostgreSQL.DATABASE_URL}}` syntax for Railway variable references.

### 4. Deploy Frontend (saddah-web)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the same Saddah repo
3. Configure:
   - **Root Directory:** `saddah-web`
   - **Dockerfile Path:** `Dockerfile.railway`
4. Set the service name to `saddah-web`

#### Frontend Environment Variables

```env
# Points to the backend Railway service (internal URL for proxy)
API_URL=http://saddah-api.railway.internal:3000

# Port for nginx
PORT=8080
```

> **Important:** `API_URL` uses Railway's **internal networking** (`*.railway.internal`) for fast, zero-cost communication between services.

### 5. Link Database References

1. Go to `saddah-api` service → **Variables**
2. Click **"Add Reference"** → select `PostgreSQL` → choose `DATABASE_URL`
3. Click **"Add Reference"** → select `Redis` → choose `REDIS_URL`, `REDISHOST`, `REDISPORT`, `REDISPASSWORD`

### 6. Generate Custom Domain (Optional)

1. Go to each service → **Settings** → **Networking**
2. Click **"Generate Domain"** for a `*.up.railway.app` URL
3. Or add a custom domain if you have one

### 7. Seed the Database

After the first successful deploy, seed the test data:

1. Go to `saddah-api` service → **Settings**
2. Open the **"Shell"** tab (Railway CLI shell)
3. Run:

```bash
npx prisma db seed
```

Or use Railway CLI locally:
```bash
railway run -s saddah-api npx prisma db seed
```

---

## Post-Deployment Checklist

- [ ] Backend health check passes: `https://<api-url>/api/v1/health`
- [ ] Swagger docs accessible: `https://<web-url>/docs`
- [ ] Frontend loads: `https://<web-url>`
- [ ] Login works with test credentials
- [ ] CORS_ORIGINS updated with actual frontend URL
- [ ] Database seeded with test data

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@saddah.io | Admin@123 |
| Sales Manager | sara@saddah.io | Manager@123 |
| Sales Rep | ahmad@saddah.io | Sales@123 |
| Sales Rep | khalid@saddah.io | Sales@123 |

---

## Useful Commands (Railway CLI)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs -s saddah-api
railway logs -s saddah-web

# Open shell in service
railway shell -s saddah-api

# Run one-off commands
railway run -s saddah-api npx prisma db seed
railway run -s saddah-api npx prisma migrate deploy
railway run -s saddah-api npx prisma studio

# Redeploy
railway up -s saddah-api
railway up -s saddah-web
```

---

## Troubleshooting

### Build Fails
- Check that `Root Directory` is set correctly (`saddah-api` or `saddah-web`)
- Verify `Dockerfile Path` is `Dockerfile.railway`

### Database Connection Issues
- Ensure `DATABASE_URL` is referenced from the PostgreSQL add-on (not hardcoded)
- Check that Prisma migrations ran: look for "prisma migrate deploy" in deploy logs

### CORS Errors
- Update `CORS_ORIGINS` in saddah-api with the actual saddah-web Railway URL
- Include `https://` protocol in the origin

### API Proxy Not Working (Frontend)
- Verify `API_URL` uses the Railway internal URL: `http://saddah-api.railway.internal:3000`
- The internal URL only works between services in the same Railway project

### Redis Connection Issues
- Use Railway reference variables: `${{Redis.REDISHOST}}`
- Don't hardcode Redis credentials

---

## Cost Estimate (Railway Hobby Plan)

| Service | ~Monthly Cost |
|---------|--------------|
| saddah-api | ~$5-10 |
| saddah-web | ~$2-5 |
| PostgreSQL | ~$5 |
| Redis | ~$5 |
| **Total** | **~$17-25/mo** |

Railway Hobby plan includes $5 credit/month. For a testing environment with light usage, costs are minimal.
