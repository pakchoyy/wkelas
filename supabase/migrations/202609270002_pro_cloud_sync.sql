-- Sinkron cloud khusus Pro: satu snapshot terkompresi per akun di bucket privat.
-- Pro = email pemilik (uji coba) atau langganan Pro aktif. Aman dijalankan ulang.
begin;

create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'choiruddin2410@gmail.com'
    or exists(
      select 1 from public.subscriptions s
      where s.user_id = (select auth.uid()) and s.plan = 'pro' and s.status = 'active'
        and (s.ends_at is null or s.ends_at > now())
    );
$$;
revoke all on function public.is_pro() from public;
grant execute on function public.is_pro() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('user-sync', 'user-sync', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "user_sync_read" on storage.objects;
create policy "user_sync_read" on storage.objects for select to authenticated using (
  bucket_id = 'user-sync' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_pro())
);
drop policy if exists "user_sync_insert" on storage.objects;
create policy "user_sync_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'user-sync' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_pro())
);
drop policy if exists "user_sync_update" on storage.objects;
create policy "user_sync_update" on storage.objects for update to authenticated
  using (bucket_id = 'user-sync' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_pro()))
  with check (bucket_id = 'user-sync' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_pro()));
drop policy if exists "user_sync_delete" on storage.objects;
create policy "user_sync_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'user-sync' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_pro())
);

commit;
