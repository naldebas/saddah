#!/bin/bash
#
# Saddah CRM - Deploy to Vercel
#
# Usage:
#   ./scripts/deploy.sh [api|web|all] [--prod]
#

set -euo pipefail

COMPONENT="${1:-all}"
PROD_FLAG=""

if [[ "${2:-}" == "--prod" ]] || [[ "${1:-}" == "--prod" ]]; then
  PROD_FLAG="--prod"
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

deploy_api() {
  echo "🚀 Deploying saddah-api..."
  cd "$ROOT_DIR/saddah-api"

  # Generate Prisma client
  npx prisma generate

  # Build
  npm run build

  # Deploy
  vercel $PROD_FLAG
  echo "   ✅ saddah-api deployed"
}

deploy_web() {
  echo "🚀 Deploying saddah-web..."
  cd "$ROOT_DIR/saddah-web"

  # Build
  npm run build

  # Deploy
  vercel $PROD_FLAG
  echo "   ✅ saddah-web deployed"
}

case "$COMPONENT" in
  api)
    deploy_api
    ;;
  web)
    deploy_web
    ;;
  all|--prod)
    deploy_api
    echo ""
    deploy_web
    ;;
  *)
    echo "Usage: ./scripts/deploy.sh [api|web|all] [--prod]"
    exit 1
    ;;
esac

echo ""
echo "✅ Deployment complete!"
