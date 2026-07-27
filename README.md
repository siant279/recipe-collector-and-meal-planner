# Cami's Meal Planner

Shared meal & snack planner for Cami (ages 3–5). Two parents, one recipe library, one plan, one shopping list.

## Stack

- **Next.js** (App Router) on Vercel
- **Supabase** (Postgres, Auth, Storage)
- Seed recipes from Kids Eat in Color cookbooks (`recipes.json`)

## Setup

1. Copy `.env.example` → `.env.local` and fill in your **personal** Supabase project keys.
2. Apply migrations in `supabase/migrations/` via the Supabase SQL editor or CLI.
3. `npm install && npm run seed` (needs `SUPABASE_SERVICE_ROLE_KEY`).
4. Create two Auth users in Supabase (email/password).
5. `npm run dev`

## Ownership

GitHub: **siant279** only. Do not push to landscapeul / Green & Rock orgs.
KEIC PDFs stay local (gitignored) — reference only.
