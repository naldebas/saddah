# SADDAH Kubernetes Manifests

Kubernetes deployment manifests for SADDAH CRM.

## Directory Structure

```
k8s/
├── namespace.yaml       # Namespace, quotas, limit ranges
├── ingress.yaml         # AWS ALB Ingress for api/app subdomains
├── network-policy.yaml  # Network isolation policies
├── kustomization.yaml   # Base kustomization
├── api/                 # API service manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── secret.yaml      # Template only - use External Secrets in prod
│   ├── hpa.yaml
│   └── kustomization.yaml
├── web/                 # Web frontend manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   └── kustomization.yaml
└── overlays/            # Environment-specific overlays
    ├── dev/
    ├── staging/
    └── prod/
```

## Deployment

### Prerequisites

1. AWS EKS cluster running (see terraform/)
2. AWS Load Balancer Controller installed
3. kubectl configured for the cluster
4. kustomize installed (or kubectl v1.14+)

### Deploy to Dev

```bash
# Preview what will be deployed
kubectl kustomize overlays/dev

# Apply to cluster
kubectl apply -k overlays/dev
```

### Deploy to Staging

```bash
kubectl apply -k overlays/staging
```

### Deploy to Production

```bash
kubectl apply -k overlays/prod
```

## Configuration

### Secrets Management

**DO NOT commit actual secrets!** Use one of:

1. **External Secrets Operator** (recommended):
   ```bash
   # Install External Secrets
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
   ```

2. **Sealed Secrets**:
   ```bash
   # Create sealed secret
   kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
   ```

3. **AWS Secrets Manager** with CSI driver

### Ingress SSL

1. Create ACM certificate for `*.saddah.io`
2. Update `ingress.yaml` with certificate ARN
3. Configure Route53 for DNS

### Environment Variables

- **ConfigMap**: Non-sensitive configuration
- **Secret**: Database URLs, API keys, JWT secrets

## Monitoring

After deployment, verify:

```bash
# Check pods
kubectl get pods -n saddah

# Check services
kubectl get svc -n saddah

# Check ingress
kubectl get ingress -n saddah

# View logs
kubectl logs -n saddah -l app=saddah-api -f

# Check HPA
kubectl get hpa -n saddah
```

## Troubleshooting

```bash
# Describe pod for events
kubectl describe pod -n saddah <pod-name>

# Check ingress controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Test service connectivity
kubectl run test --rm -it --image=curlimages/curl -- curl http://saddah-api.saddah.svc.cluster.local/api/v1/health
```
