-- Fondasi akun dan monetisasi BGY Wali Kelas.
-- Belum mengaktifkan paywall; aplikasi tetap gratis selama mode pengembangan.

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

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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

create table if not exists public.pak_choy_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  subject text,
  education_level text,
  class_level text,
  version text,
  storage_path text not null unique,
  file_format text,
  file_size bigint,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  download_count bigint not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config(key,value)
values
  ('monetization', '{"mode":"free-development","trial_enabled":false}'::jsonb),
  ('plans', '{"free":{"enabled":true},"pro":{"enabled":false,"billing_period":"semester"}}'::jsonb)
on conflict (key) do nothing;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.feedback enable row level security;
alter table public.pak_choy_files enable row level security;
alter table public.app_config enable row level security;

create policy "profile_read_own" on public.profiles for select using (auth.uid() = id);
create policy "profile_update_own" on public.profiles for update using (auth.uid() = id);
create policy "subscription_read_own" on public.subscriptions for select using (auth.uid() = user_id);
create policy "feedback_insert_own" on public.feedback for insert with check (auth.uid() = user_id);
create policy "published_files_public_read" on public.pak_choy_files for select using (status = 'published');
create policy "public_config_read" on public.app_config for select using (true);

-- Kebijakan tulis admin sebaiknya dijalankan melalui server/Edge Function.
-- Jangan pernah meletakkan service_role key di aplikasi browser.
