-- Sinkron cloud khusus Pro: satu snapshot terkompresi per akun di bucket privat.
-- Pro = email pemilik (uji coba) atau langganan Pro aktif. Aman dijalankan ulang.
begin;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscriptions_one_active
  on public.subscriptions(user_id) where status = 'active';
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
drop policy if exists "subscription_read_own" on public.subscriptions;
create policy "subscription_read_own" on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

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
