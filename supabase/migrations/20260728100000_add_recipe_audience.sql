-- Who a recipe is for: Cami-friendly kid meals vs adult collection
alter table recipes
  add column if not exists audience text
    check (audience in ('cami', 'adult'));

create index if not exists recipes_audience_idx on recipes (audience);

-- Existing KEIC library is Cami-friendly
update recipes set audience = 'cami' where audience is null;
