-- Shared household pantry inventory
create table pantry_items (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  normalized  text not null,
  added_by    uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (normalized)
);

create index pantry_items_normalized_idx on pantry_items (normalized);

alter table pantry_items enable row level security;

create policy "household read/write pantry"
  on pantry_items
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
