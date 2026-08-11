# Recipe Collector and Meal Planner — setup checklist
# Personal accounts only (siant279 / personal Supabase / personal Vercel)

## 1. GitHub (`siant279`)

```bash
gh auth login -h github.com -p https -w   # choose siant279, NOT sianlandscapeul
gh api user --jq .login                   # must print: siant279
```

## 2. Supabase (personal dashboard)

1. https://supabase.com/dashboard — confirm you're on your **personal** account
2. New project → name `camis-meal-planner` (Supabase DB project; can keep this ID)
3. SQL Editor → paste/run `supabase/migrations/20260727100000_initial_schema.sql`
4. Authentication → Users → add two email/password users (you + partner)
5. Project Settings → API → copy URL, anon key, service role key into `.env.local`

## 3. Local env

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# optional: ANTHROPIC_API_KEY for recipe parsing
npm install
npm run seed
npm run dev
```

## 4. Vercel (personal account)

1. https://vercel.com — confirm **personal** team (not Green & Rock)
2. Import `siant279/recipe-collector-and-meal-planner`
3. Add the same env vars (+ `ANTHROPIC_API_KEY`, optional `CRON_SECRET`)
4. Deploy → https://recipe-collector-and-meal-planner.vercel.app

## 5. Phase 3 (optional later)

Set Gmail/Drive OAuth env vars and `CRON_SECRET`. Cron hits `/api/ingest` once daily at 14:00 UTC (`vercel.json`; Hobby plan allows one run/day).
