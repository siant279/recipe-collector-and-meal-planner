-- Cami's Meal Planner — Supabase Postgres schema
-- Two-user household app. Auth is handled by Supabase Auth (auth.users);
-- every table below just references auth.uid() for who-did-what, but data
-- itself is shared/visible to both household members (no per-user siloing).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Core recipe library
-- ---------------------------------------------------------------------
create table recipes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  source          text,                     -- e.g. "Everyday Lunches", or a URL/host for web imports
  meal_type       text check (meal_type in ('breakfast','lunch','snack','dinner')),
  day             int,                      -- optional: original day-of-rotation from source book
  servings        text,
  prep_time       text,
  cook_time       text,
  ingredients     jsonb not null default '[]',   -- array of strings
  directions      jsonb not null default '[]',   -- array of strings
  optional_sides  jsonb default '[]',
  choking_flags   jsonb default '[]',       -- array of hazard-category strings, keyword-scanned
  tags            text[] default '{}',      -- free-form tags (e.g. "no-bake", "freezer-friendly")
  image_url       text,
  source_url      text,                     -- populated when ingested from a web link
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index recipes_meal_type_idx on recipes (meal_type);
create index recipes_title_trgm_idx on recipes using gin (title gin_trgm_ops);
-- requires: create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Ingestion queue — anything pasted/forwarded/uploaded lands here first,
-- gets parsed (by an edge function or the app calling an LLM), and a human
-- approves it before it becomes a row in `recipes`.
-- ---------------------------------------------------------------------
create table recipe_submissions (
  id              uuid primary key default gen_random_uuid(),
  raw_input       text,                     -- pasted text, URL, or extracted file text
  input_type      text check (input_type in ('url','text','email','pdf','image','drive_file')),
  source_ref      text,                     -- URL, email message id, or Drive file id
  parsed_recipe   jsonb,                    -- structured draft in the same shape as `recipes` columns
  status          text not null default 'pending'
                    check (status in ('pending','parsed','needs_review','approved','rejected')),
  parse_error     text,
  submitted_by    uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id),
  approved_recipe_id uuid references recipes(id)
);

-- ---------------------------------------------------------------------
-- Meal plan — shared household plan, one row per (date, meal_type)
-- ---------------------------------------------------------------------
create table meal_plan (
  id          uuid primary key default gen_random_uuid(),
  plan_date   date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  recipe_id   uuid references recipes(id) on delete set null,
  notes       text,
  added_by    uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (plan_date, meal_type, recipe_id)
);

-- ---------------------------------------------------------------------
-- Shopping list — shared, checkable items. Can originate from a recipe's
-- ingredients or be added freehand.
-- ---------------------------------------------------------------------
create table shopping_list_items (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  checked     boolean not null default false,
  recipe_id   uuid references recipes(id) on delete set null,
  added_by    uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security — both household members are full read/write on
-- everything (there's no concept of "my data" vs "their data" here).
-- Replace the two UUIDs below with the actual auth.users ids once both
-- accounts exist, or simplify to `using (auth.role() = 'authenticated')`
-- if you don't need to restrict beyond "must be logged in".
-- ---------------------------------------------------------------------
alter table recipes enable row level security;
alter table recipe_submissions enable row level security;
alter table meal_plan enable row level security;
alter table shopping_list_items enable row level security;

create policy "household read/write recipes" on recipes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "household read/write submissions" on recipe_submissions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "household read/write plan" on meal_plan
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "household read/write shopping list" on shopping_list_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
