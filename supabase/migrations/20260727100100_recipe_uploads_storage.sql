-- Recipe upload storage (Phase 2)
-- Safe to re-run; ignores if bucket/policies already exist.

insert into storage.buckets (id, name, public)
values ('recipe-uploads', 'recipe-uploads', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated upload recipe files'
  ) then
    create policy "authenticated upload recipe files"
      on storage.objects for insert
      with check (bucket_id = 'recipe-uploads' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated read recipe files'
  ) then
    create policy "authenticated read recipe files"
      on storage.objects for select
      using (bucket_id = 'recipe-uploads' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated delete recipe files'
  ) then
    create policy "authenticated delete recipe files"
      on storage.objects for delete
      using (bucket_id = 'recipe-uploads' and auth.role() = 'authenticated');
  end if;
end $$;
