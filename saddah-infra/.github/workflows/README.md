# CI/CD Workflows

## Overview

SADDAH uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. Deploy (`deploy.yml`)

Main deployment workflow that builds and deploys to Kubernetes.

**Triggers:**
- Manual dispatch (workflow_dispatch) with environment selection
- Push to `main` or `develop` branches

**Jobs:**
- `changes` - Detect which components changed
- `build-api` - Build and push API Docker image to ECR
- `build-web` - Build and push Web Docker image to ECR
- `deploy` - Deploy to Kubernetes using Helm
- `notify-failure` - Send Slack notification on failure

**Manual Deployment:**
```bash
gh workflow run deploy.yml -f environment=staging -f api_tag=abc123
```

### 2. Terraform (`terraform.yml`)

Infrastructure deployment for AWS resources.

**Triggers:**
- Push to `main` branch with changes in `terraform/**`
- Pull requests with changes in `terraform/**`

## Required Secrets

Configure these in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_ACCOUNT_ID` | AWS account ID for ECR |
| `ACM_CERTIFICATE_ARN` | AWS ACM certificate ARN for TLS |
| `SLACK_WEBHOOK_URL` | (Optional) Slack webhook for notifications |

## Environments

GitHub Environments should be configured:

- `dev` - Development environment
- `staging` - Staging environment (requires approval)
- `prod` - Production environment (requires approval)

## Deployment Flow

```
Push to develop → Build → Deploy to dev
Push to main    → Build → Deploy to staging
Manual dispatch → Build → Deploy to selected environment
```

## Rollback

To rollback a deployment:

```bash
# List deployments
helm history saddah -n saddah-staging

# Rollback to previous version
helm rollback saddah -n saddah-staging

# Or deploy a specific image tag
gh workflow run deploy.yml -f environment=staging -f api_tag=previous-sha
```
