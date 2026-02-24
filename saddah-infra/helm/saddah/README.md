# SADDAH Helm Chart

Helm chart for deploying SADDAH CRM on Kubernetes (AWS EKS).

## Prerequisites

- Kubernetes 1.24+
- Helm 3.0+
- AWS ALB Ingress Controller (for ingress)
- External Secrets Operator (for production secrets)

## Installation

### Development

```bash
helm install saddah . -f values.yaml -f values-dev.yaml -n saddah-dev --create-namespace
```

### Staging

```bash
helm install saddah . -f values.yaml -f values-staging.yaml -n saddah-staging --create-namespace
```

### Production

```bash
helm install saddah . -f values.yaml -f values-prod.yaml -n saddah --create-namespace
```

## Configuration

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment name | `dev` |
| `global.imageRegistry` | Container registry URL | `""` |
| `global.imagePullSecrets` | Image pull secrets | `[]` |

### API Service

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.enabled` | Enable API service | `true` |
| `api.replicaCount` | Number of replicas | `2` |
| `api.image.repository` | Image repository | `saddah-api` |
| `api.image.tag` | Image tag | `latest` |
| `api.resources.requests.cpu` | CPU request | `100m` |
| `api.resources.requests.memory` | Memory request | `256Mi` |
| `api.autoscaling.enabled` | Enable HPA | `true` |
| `api.autoscaling.minReplicas` | Min replicas | `2` |
| `api.autoscaling.maxReplicas` | Max replicas | `10` |

### Web Service

| Parameter | Description | Default |
|-----------|-------------|---------|
| `web.enabled` | Enable Web service | `true` |
| `web.replicaCount` | Number of replicas | `2` |
| `web.image.repository` | Image repository | `saddah-web` |
| `web.image.tag` | Image tag | `latest` |
| `web.nginx.enabled` | Enable nginx config | `true` |

### Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `alb` |
| `ingress.hosts.api.host` | API hostname | `api.saddah.io` |
| `ingress.hosts.web.host` | Web hostname | `app.saddah.io` |
| `ingress.tls.enabled` | Enable TLS | `true` |
| `ingress.tls.certificateArn` | ACM certificate ARN | `""` |

## Upgrading

```bash
helm upgrade saddah . -f values.yaml -f values-prod.yaml -n saddah
```

## Uninstalling

```bash
helm uninstall saddah -n saddah
```

## Templates Included

- **api-deployment.yaml** - API service deployment
- **web-deployment.yaml** - Web frontend deployment
- **services.yaml** - Kubernetes services
- **configmaps.yaml** - Configuration and nginx config
- **secrets.yaml** - Secrets (use External Secrets in production)
- **ingress.yaml** - AWS ALB Ingress
- **hpa.yaml** - Horizontal Pod Autoscalers
- **pdb.yaml** - Pod Disruption Budgets
- **serviceaccount.yaml** - Service account for IRSA
- **namespace.yaml** - Namespace and resource quotas
