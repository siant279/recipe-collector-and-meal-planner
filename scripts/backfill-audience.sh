#!/usr/bin/env bash
# Backfill audience='cami' on existing recipes (run after migration)
set -euo pipefail
set -a; source .env.local; set +a
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('recipes').update({ audience: 'cami' }).is('audience', null).then(({ error, count }) => {
  if (error) { console.error(error); process.exit(1); }
  console.log('Backfilled Cami-friendly audience on existing recipes');
});
"
