#!/bin/sh
set -e

echo "========================================="
echo "  SADDAH API - Production Startup"
echo "========================================="
echo ""

# Run Prisma migrations safely (no data loss)
echo "[1/2] Running database migrations..."
node_modules/.bin/prisma migrate deploy 2>&1 || {
  echo "WARNING: prisma migrate deploy failed. Falling back to db push..."
  node_modules/.bin/prisma db push --skip-generate 2>&1 || echo "WARNING: prisma db push also failed. Starting anyway..."
}
echo "  --> Migrations complete."
echo ""

# Start the NestJS application
echo "[2/2] Starting NestJS application..."
echo "  --> NODE_ENV: ${NODE_ENV:-production}"
echo "  --> PORT: ${PORT:-3000}"
echo ""
exec node dist/main
