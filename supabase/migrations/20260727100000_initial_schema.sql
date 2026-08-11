-- Recipe Collector and Meal Planner — initial schema
-- Two-user household. Shared data for all authenticated users.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- Core recipe library
-- ---------------------------------------------------------------------
create table recipes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  source          text,
  meal_type       text check (meal_type in ('breakfast','lunch','snack','dinner')),
  day             int,
  servings        text,
  prep_time       text,
  cook_time       text,
  ingredients     jsonb not null default '[]',
  directions      jsonb not null default '[]',
  optional_sides  jsonb default '[]',
  choking_flags   jsonb default '[]',
  tags            text[] default '{}',
  image_url       text,
  source_url      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index recipes_meal_type_idx on recipes (meal_type);
create index recipes_title_trgm_idx on recipes using gin (title gin_trgm_ops);
create index recipes_ingredients_gin_idx on recipes using gin (ingredients);

-- ---------------------------------------------------------------------
-- Ingestion queue
-- ---------------------------------------------------------------------
create table recipe_submissions (
  id              uuid primary key default gen_random_uuid(),
  raw_input       text,
  input_type      text check (input_type in ('url','text','email','pdf','image','drive_file')),
  source_ref      text,
  parsed_recipe   jsonb,
  status          text not null default 'pending'
                    check (status in ('pending','parsed','needs_review','approved','rejected')),
  parse_error     text,
  submitted_by    uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id),
  approved_recipe_id uuid references recipes(id)
);

create index recipe_submissions_status_idx on recipe_submissions (status);

-- ---------------------------------------------------------------------
-- Meal plan — one recipe per date + meal_type slot
-- ---------------------------------------------------------------------
create table meal_plan (
  id          uuid primary key default gen_random_uuid(),
  plan_date   date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  recipe_id   uuid references recipes(id) on delete set null,
  notes       text,
  added_by    uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (plan_date, meal_type)
);

create index meal_plan_date_idx on meal_plan (plan_date);

-- ---------------------------------------------------------------------
-- Shopping list
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
-- RLS — any authenticated household member has full read/write
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
