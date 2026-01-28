# environments/dev/main.tf
# SADDAH Development Environment
# CRITICAL: AWS Saudi Region (me-south-1) for PDPL compliance

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "saddah-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "me-south-1"
    encrypt        = true
    dynamodb_table = "saddah-terraform-locks"
  }
}

provider "aws" {
  region = "me-south-1" # AWS Saudi - MANDATORY for PDPL

  default_tags {
    tags = {
      Project     = "saddah"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# Variables
variable "environment" {
  default = "dev"
}

variable "project" {
  default = "saddah"
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  environment = var.environment
  project     = var.project
  vpc_cidr    = "10.0.0.0/16"

  availability_zones = ["me-south-1a", "me-south-1b"]
}

# EKS Module
module "eks" {
  source = "../../modules/eks"

  environment = var.environment
  project     = var.project
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  kubernetes_version  = "1.29"
  node_instance_types = ["t3.medium"]
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 4
}

# RDS Module
module "rds" {
  source = "../../modules/rds"

  environment = var.environment
  project     = var.project
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.data_subnet_ids

  allowed_security_groups = [module.eks.cluster_security_group_id]

  instance_class          = "db.t3.medium"
  allocated_storage       = 20
  max_allocated_storage   = 100
  engine_version          = "15.4"
  multi_az                = false
  backup_retention_period = 7
}

# ECR Repositories
resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.project}-web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "rds_secret_arn" {
  value = module.rds.secret_arn
}

output "ecr_api_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_web_url" {
  value = aws_ecr_repository.web.repository_url
}
