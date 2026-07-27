#!/usr/bin/env bash
# Provision personal Supabase project for Cami's Meal Planner.
# Usage:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # from https://supabase.com/dashboard/account/tokens
#   ./scripts/provision-supabase.sh
#
# IMPORTANT: Use your PERSONAL Supabase account — not Green & Rock.

set -euo pipefail

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN first (personal account access token)."
  exit 1
fi

supabase login --token "$SUPABASE_ACCESS_TOKEN"

echo "Organizations:"
supabase orgs list

ORG_ID="${SUPABASE_ORG_ID:-}"
if [[ -z "$ORG_ID" ]]; then
  echo "Set SUPABASE_ORG_ID to your personal org id from the list above (not Green & Rock)."
  exit 1
fi

# Create project if it doesn't already exist
if supabase projects list -o json 2>/dev/null | grep -q '"name":"camis-meal-planner"'; then
  echo "Project camis-meal-planner already exists"
else
  echo "Creating project camis-meal-planner..."
  DB_PASSWORD="${SUPABASE_DB_PASSWORD:-$(openssl rand -base64 24)}"
  supabase projects create camis-meal-planner \
    --org-id "$ORG_ID" \
    --db-password "$DB_PASSWORD" \
    --region us-west-1
  echo "DB password (save it): $DB_PASSWORD"
fi

PROJECT_REF=$(supabase projects list -o json | python3 -c "
import json,sys
rows=json.load(sys.stdin)
for r in rows:
  if r.get('name')=='camis-meal-planner':
    print(r.get('id') or r.get('ref') or '')
    break
")

if [[ -z "$PROJECT_REF" ]]; then
  echo "Could not resolve project ref"
  exit 1
fi

echo "Project ref: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

echo "Pushing migrations..."
supabase db push

echo "Fetching API keys into .env.local (merge)..."
API_URL="https://${PROJECT_REF}.supabase.co"
# Keys via management API
KEYS_JSON=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys")

ANON=$(echo "$KEYS_JSON" | python3 -c "import json,sys; ks=json.load(sys.stdin); print(next(k['api_key'] for k in ks if k.get('name')=='anon' or k.get('type')=='anon'))")
SERVICE=$(echo "$KEYS_JSON" | python3 -c "import json,sys; ks=json.load(sys.stdin); print(next(k['api_key'] for k in ks if k.get('name')=='service_role' or k.get('type')=='service_role'))")

touch .env.local
grep -q '^NEXT_PUBLIC_SUPABASE_URL=' .env.local 2>/dev/null && \
  sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$API_URL|" .env.local || \
  echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL" >> .env.local
grep -q '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local 2>/dev/null && \
  sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON|" .env.local || \
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON" >> .env.local
grep -q '^SUPABASE_SERVICE_ROLE_KEY=' .env.local 2>/dev/null && \
  sed -i.bak "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE|" .env.local || \
  echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE" >> .env.local
rm -f .env.local.bak

echo "Seeding recipes..."
npm run seed

echo "Done. Create two Auth users in the Supabase dashboard, then:"
echo "  vercel env pull   # or set the three keys on Vercel under siant279s-projects"
echo "  vercel --prod --scope siant279s-projects"
