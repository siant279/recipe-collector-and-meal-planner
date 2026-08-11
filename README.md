# Recipe Collector and Meal Planner

Household recipe library, meal planner, and shopping list — with Cami-friendly and adult labels.

**Live:** https://recipe-collector-and-meal-planner.vercel.app  
**Repo:** https://github.com/siant279/recipe-collector-and-meal-planner (private)

## Stack

- **Next.js** (App Router) on Vercel (`siant279s-projects` — personal, not Green & Rock)
- **Vercel project:** `recipe-collector-and-meal-planner`
- **Supabase** project `camis-meal-planner` under **siant279's Org** (DB project ID unchanged)
- Seed recipes from Kids Eat in Color cookbooks (`recipes.json`)

## Setup

1. Copy `.env.example` → `.env.local` (or use existing keys from the personal Supabase project).
2. Apply migrations in `supabase/migrations/` (already applied on the cloud project).
3. `npm install && npm run seed` (needs `SUPABASE_SERVICE_ROLE_KEY`).
4. Two Auth users already exist for the household; add more in Supabase Auth if needed.
5. `npm run dev`

See [SETUP.md](SETUP.md) for cloud provisioning details.

## Ownership

GitHub: **siant279** only. Do not push to landscapeul / Green & Rock orgs.  
Vercel: **siant279s-projects** only (never `green-rock-inc`).  
KEIC PDFs stay local (gitignored) — reference only.
