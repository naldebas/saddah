# 🚀 SADDAH Project Setup Guide

Complete guide to set up SADDAH CRM from scratch.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git
- AWS CLI (for production)
- Terraform 1.5+ (for production)

## 📁 Project Structure

```
saddah/
├── saddah-api/        # NestJS Backend
├── saddah-web/        # React Frontend
└── saddah-infra/      # Terraform Infrastructure
```

---

## 🔧 Step 1: Create GitHub Repositories

```bash
# Create repos on GitHub first, then:

# Backend
cd saddah-api
git init
git add .
git commit -m "🎉 Initial commit: SADDAH API"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/saddah-api.git
git push -u origin main

# Frontend
cd ../saddah-web
git init
git add .
git commit -m "🎉 Initial commit: SADDAH Web"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/saddah-web.git
git push -u origin main

# Infrastructure
cd ../saddah-infra
git init
git add .
git commit -m "🎉 Initial commit: SADDAH Infrastructure"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/saddah-infra.git
git push -u origin main
```

---

## 🖥️ Step 2: Local Development Setup

### Start Backend

```bash
cd saddah-api

# Install dependencies
npm install

# Start PostgreSQL & Redis
docker-compose up -d

# Configure environment
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database with test data
npm run prisma:seed

# Start development server
npm run start:dev

# Server runs at: http://localhost:3000
# Swagger docs: http://localhost:3000/docs
```

### Start Frontend

```bash
cd saddah-web

# Install dependencies
npm install

# Start development server
npm run dev

# App runs at: http://localhost:5173
```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@saddah.io | Admin@123 |
| Sales Rep | ahmad@saddah.io | Sales@123 |

---

## ☁️ Step 3: AWS Infrastructure (Production)

### Initial AWS Setup

```bash
# 1. Create S3 bucket for Terraform state
aws s3 mb s3://saddah-terraform-state --region me-south-1

# 2. Enable versioning
aws s3api put-bucket-versioning \
  --bucket saddah-terraform-state \
  --versioning-configuration Status=Enabled

# 3. Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name saddah-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region me-south-1
```

### Deploy Infrastructure

```bash
cd saddah-infra/terraform/environments/dev

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply (creates all AWS resources)
terraform apply

# Get outputs
terraform output
```

### Configure kubectl

```bash
aws eks update-kubeconfig \
  --region me-south-1 \
  --name saddah-dev
```

---

## 🔄 Step 4: CI/CD Pipeline

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password |

### Workflow Triggers

- **Backend CI:** Push to `main` or `develop` branches
- **Frontend CI:** Push to `main` or `develop` branches
- **Infrastructure:** Push to `main` branch (manual approval for apply)

---

## 📋 Development Workflow

### Daily Development

1. Create feature branch: `git checkout -b feature/SADDAH-123-feature-name`
2. Make changes
3. Run tests: `npm test`
4. Run lint: `npm run lint`
5. Commit with conventional commits: `git commit -m "feat: add contact search"`
6. Push and create PR
7. After review, merge to `develop`
8. After testing, merge to `main`

### Branch Strategy

```
main          (production)
  └── develop (staging)
        └── feature/SADDAH-xxx-description
        └── bugfix/SADDAH-xxx-description
        └── hotfix/SADDAH-xxx-description
```

---

## 📱 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/contacts` | List contacts |
| POST | `/api/v1/contacts` | Create contact |
| GET | `/api/v1/contacts/:id` | Get contact |
| PATCH | `/api/v1/contacts/:id` | Update contact |
| DELETE | `/api/v1/contacts/:id` | Delete contact |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |

---

## 🔒 Security Checklist

- [ ] Change default JWT secrets in production
- [ ] Enable AWS CloudTrail
- [ ] Configure AWS WAF
- [ ] Set up AWS GuardDuty
- [ ] Enable RDS encryption
- [ ] Configure backup retention
- [ ] Set up monitoring & alerts

---

## 📞 Support

For issues or questions, create an issue in the respective GitHub repository.

---

**Happy Building! 🎉**

SADDAH Team
