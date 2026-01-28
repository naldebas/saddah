# SADDAH API

AI-Powered CRM API for Saudi Real Estate Market.

## Tech Stack

- **Framework:** NestJS 10
- **Database:** PostgreSQL 15
- **ORM:** Prisma
- **Cache:** Redis
- **Auth:** JWT with refresh tokens
- **Docs:** Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Setup

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd saddah-api
   npm install
   ```

2. **Start database:**
   ```bash
   npm run docker:up
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Seed database:**
   ```bash
   npm run prisma:seed
   ```

6. **Start development server:**
   ```bash
   npm run start:dev
   ```

7. **Open API docs:**
   ```
   http://localhost:3000/docs
   ```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@saddah.io | Admin@123 |
| Sales Rep | ahmad@saddah.io | Sales@123 |

## Project Structure

```
src/
├── modules/
│   ├── auth/           # Authentication & authorization
│   ├── users/          # User management
│   ├── contacts/       # Contact management
│   ├── companies/      # Company management
│   ├── deals/          # Deal/opportunity management
│   ├── leads/          # Lead management
│   ├── activities/     # Activity tracking
│   └── health/         # Health check endpoint
├── prisma/
│   └── prisma.service.ts
├── app.module.ts
└── main.ts
```

## API Documentation

Once running, visit `/docs` for Swagger documentation.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/refresh | Refresh token |
| GET | /api/v1/contacts | List contacts |
| POST | /api/v1/contacts | Create contact |
| GET | /api/v1/health | Health check |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in development mode |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run prisma:studio` | Open Prisma Studio |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `REDIS_HOST` | Redis host | localhost |

## Multi-tenancy

This API supports multi-tenancy with tenant isolation:

- All queries are automatically scoped to the tenant
- Tenant ID is extracted from JWT token
- Data cannot leak between tenants

## License

Proprietary - SADDAH Team
