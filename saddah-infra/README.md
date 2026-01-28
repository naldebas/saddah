# SADDAH Infrastructure

Terraform Infrastructure as Code for SADDAH CRM.

## AWS Region

**CRITICAL: AWS Saudi Region (me-south-1) is MANDATORY for PDPL compliance.**

All resources are deployed to `me-south-1` to comply with Saudi Arabia's Personal Data Protection Law (PDPL).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AWS me-south-1 (Saudi)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │   Public Subnet A   │  │   Public Subnet B   │                   │
│  │   (NAT, ALB)        │  │   (NAT, ALB)        │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │  Private Subnet A   │  │  Private Subnet B   │                   │
│  │   (EKS Nodes)       │  │   (EKS Nodes)       │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │   Data Subnet A     │  │   Data Subnet B     │                   │
│  │   (RDS, Redis)      │  │   (RDS, Redis)      │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Service | Purpose |
|-----------|---------|---------|
| VPC | AWS VPC | Network isolation |
| EKS | Amazon EKS 1.29 | Kubernetes cluster |
| RDS | PostgreSQL 15 | Primary database |
| Redis | ElastiCache | Caching & sessions |
| ECR | Amazon ECR | Container registry |
| KMS | AWS KMS | Encryption keys |
| Secrets Manager | AWS SM | Credentials storage |

## Quick Start

### Prerequisites

- Terraform 1.5+
- AWS CLI configured
- AWS account with me-south-1 access

### Initial Setup

1. **Create S3 backend bucket:**
   ```bash
   aws s3 mb s3://saddah-terraform-state --region me-south-1
   aws s3api put-bucket-versioning \
     --bucket saddah-terraform-state \
     --versioning-configuration Status=Enabled
   ```

2. **Create DynamoDB table for locking:**
   ```bash
   aws dynamodb create-table \
     --table-name saddah-terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region me-south-1
   ```

3. **Initialize Terraform:**
   ```bash
   cd terraform/environments/dev
   terraform init
   ```

4. **Plan and apply:**
   ```bash
   terraform plan
   terraform apply
   ```

## Environments

| Environment | Directory | Purpose |
|-------------|-----------|---------|
| dev | `environments/dev` | Development |
| staging | `environments/staging` | Pre-production |
| prod | `environments/prod` | Production |

## Modules

| Module | Purpose |
|--------|---------|
| vpc | VPC, subnets, NAT gateways |
| eks | EKS cluster and node groups |
| rds | PostgreSQL database |
| redis | ElastiCache Redis cluster |
| ecr | Container registries |

## Security

- All data encrypted at rest (KMS)
- All data encrypted in transit (TLS)
- Database credentials in Secrets Manager
- Private subnets for workloads
- Security groups for access control

## Costs (Estimated Monthly)

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| EKS | ~$150 | ~$200 | ~$350 |
| RDS | ~$50 | ~$100 | ~$250 |
| NAT | ~$90 | ~$90 | ~$180 |
| ALB | ~$20 | ~$25 | ~$50 |
| **Total** | **~$310** | **~$415** | **~$830** |

## Maintenance

### Updating EKS
```bash
# Update kubernetes_version in variables
terraform plan
terraform apply
```

### RDS Snapshots
Automatic daily snapshots with 7-day retention (dev) or 30-day (prod).

### Security Updates
Auto minor version upgrades enabled for RDS and EKS node groups.

## License

Proprietary - SADDAH Team
