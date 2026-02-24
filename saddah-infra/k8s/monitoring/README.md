# CloudWatch Monitoring for SADDAH

This directory contains Kubernetes manifests for AWS CloudWatch observability.

## Components

1. **Fluent Bit** - Log forwarding to CloudWatch Logs
2. **CloudWatch Agent** - Container Insights metrics

## Prerequisites

1. EKS cluster with OIDC provider configured
2. IAM roles created via Terraform monitoring module
3. IRSA (IAM Roles for Service Accounts) enabled

## Deployment

### 1. Apply Terraform Module First

```bash
cd saddah-infra/terraform/environments/dev
terraform apply
```

This creates the necessary IAM roles and CloudWatch resources.

### 2. Update Role ARNs

Replace placeholders in the manifests:

```bash
# Get role ARNs from Terraform output
export FLUENT_BIT_ROLE_ARN=$(terraform output -raw fluent_bit_role_arn)
export CLOUDWATCH_AGENT_ROLE_ARN=$(terraform output -raw cloudwatch_agent_role_arn)

# Apply with substitution
envsubst < fluent-bit-daemonset.yaml | kubectl apply -f -
envsubst < cloudwatch-agent-daemonset.yaml | kubectl apply -f -
```

### 3. Or Use Kustomize with Patches

```bash
kubectl apply -k .
```

## Verify Deployment

```bash
# Check Fluent Bit pods
kubectl get pods -n amazon-cloudwatch -l app.kubernetes.io/name=fluent-bit

# Check CloudWatch Agent pods
kubectl get pods -n amazon-cloudwatch -l app.kubernetes.io/name=cloudwatch-agent

# Check Fluent Bit logs
kubectl logs -n amazon-cloudwatch -l app.kubernetes.io/name=fluent-bit --tail=100
```

## CloudWatch Resources

### Log Groups
- `/aws/containerinsights/{cluster}/application` - Application container logs
- `/aws/containerinsights/{cluster}/host` - Node host logs
- `/aws/containerinsights/{cluster}/dataplane` - Kubernetes dataplane logs

### Dashboard
Access the dashboard at:
`https://console.aws.amazon.com/cloudwatch/home?region=me-south-1#dashboards:name=saddah-eks-dashboard`

### Alarms
- `saddah-eks-api-high-cpu` - API CPU > 80%
- `saddah-eks-api-high-memory` - API Memory > 85%
- `saddah-eks-pod-restarts` - Pod restarts > 5 in 5 minutes
- `saddah-eks-node-high-cpu` - Node CPU > 85%
- `saddah-eks-node-high-memory` - Node Memory > 85%

## Troubleshooting

### Logs not appearing in CloudWatch

1. Check Fluent Bit pod logs for errors
2. Verify IAM role ARN annotation on service account
3. Check CloudWatch log group permissions

### Metrics not appearing

1. Check CloudWatch Agent pod logs
2. Verify Container Insights is enabled for the cluster
3. Check IAM permissions

## Cost Optimization

- Log retention is set to 30 days by default
- Adjust `log_retention_days` in Terraform variables
- Consider log filtering to reduce ingestion costs
