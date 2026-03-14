#!/bin/bash
#
# Saddah CRM - Database Migration Script
# Migrates data from Railway PostgreSQL to Supabase
#
# Usage:
#   ./scripts/migrate-to-supabase.sh
#
# Prerequisites:
#   - pg_dump and psql installed
#   - Set environment variables below or export them before running
#

set -euo pipefail

echo "╔══════════════════════════════════════════════════╗"
echo "║   Saddah CRM - Railway → Supabase Migration     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# --- Configuration ---
RAILWAY_DB_URL="${RAILWAY_DATABASE_URL:-}"
SUPABASE_DB_URL="${SUPABASE_DIRECT_URL:-}"
BACKUP_FILE="saddah_backup_$(date +%Y%m%d_%H%M%S).sql"

# --- Validation ---
if [ -z "$RAILWAY_DB_URL" ]; then
  echo "❌ Error: RAILWAY_DATABASE_URL is not set"
  echo "   Export it: export RAILWAY_DATABASE_URL='postgresql://...'"
  exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DIRECT_URL is not set"
  echo "   Export it: export SUPABASE_DIRECT_URL='postgresql://...'"
  exit 1
fi

# --- Step 1: Backup from Railway ---
echo "📦 Step 1: Exporting database from Railway..."
echo "   Backup file: $BACKUP_FILE"
pg_dump "$RAILWAY_DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "   ✅ Backup complete ($BACKUP_SIZE)"
echo ""

# --- Step 2: Run Prisma Migrations on Supabase ---
echo "🔧 Step 2: Running Prisma migrations on Supabase..."
cd "$(dirname "$0")/../saddah-api"

export DATABASE_URL="$SUPABASE_DB_URL"
export DIRECT_URL="$SUPABASE_DB_URL"

npx prisma migrate deploy
echo "   ✅ Migrations applied"
echo ""

# --- Step 3: Import Data ---
echo "📥 Step 3: Importing data to Supabase..."
psql "$SUPABASE_DB_URL" < "../$BACKUP_FILE"
echo "   ✅ Data imported"
echo ""

# --- Step 4: Verify ---
echo "🔍 Step 4: Verifying migration..."
TENANT_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null | tr -d ' ')
USER_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
LEAD_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM leads;" 2>/dev/null | tr -d ' ')
CONTACT_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM contacts;" 2>/dev/null | tr -d ' ')

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║               Migration Summary                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Tenants:  $TENANT_COUNT"
echo "║  Users:    $USER_COUNT"
echo "║  Leads:    $LEAD_COUNT"
echo "║  Contacts: $CONTACT_COUNT"
echo "║                                                  ║"
echo "║  Backup:   $BACKUP_FILE                          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "  1. Update DATABASE_URL in Vercel env vars to Supabase pooled URL (port 6543)"
echo "  2. Update DIRECT_URL in Vercel env vars to Supabase direct URL (port 5432)"
echo "  3. Deploy: cd saddah-api && vercel --prod"
echo "  4. Verify API: curl https://saddah-api.vercel.app/api/v1/health"
