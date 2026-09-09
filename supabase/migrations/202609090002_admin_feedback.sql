begin;

create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('saran','kritik','masalah')),
  message text not null,
  page text,
  app_version text,
  status text not null default 'baru' check (status in ('baru','dibaca','selesai')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.feedback enable row level security;

grant select, update on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
drop policy if exists "profile_read_own" on public.profiles;
create policy "profile_read_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated using (auth.uid() = id);
drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles for insert to authenticated
  with check (auth.uid() = id);

grant select, update on public.feedback to authenticated;
grant insert on public.feedback to authenticated;
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "feedback_admin_read" on public.feedback;
create policy "feedback_admin_read" on public.feedback for select to authenticated
  using ((select public.is_pak_choy_admin()));
drop policy if exists "feedback_admin_update" on public.feedback;
create policy "feedback_admin_update" on public.feedback for update to authenticated
  using ((select public.is_pak_choy_admin()))
  with check ((select public.is_pak_choy_admin()));

commit;
