begin;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (length(trim(judul)) between 1 and 160),
  isi text not null check (length(trim(isi)) between 1 and 4000),
  jenis text not null default 'info' check (jenis in ('info','peringatan','update','penting')),
  target text not null default 'semua' check (target in ('semua','pro','free')),
  is_aktif boolean not null default true,
  tanggal_mulai date,
  tanggal_selesai date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
drop policy if exists "announcement_public_read" on public.announcements;
create policy "announcement_public_read" on public.announcements for select to anon, authenticated
  using (is_aktif and (tanggal_mulai is null or tanggal_mulai <= current_date) and (tanggal_selesai is null or tanggal_selesai >= current_date));
drop policy if exists "announcement_admin_write" on public.announcements;
create policy "announcement_admin_write" on public.announcements for all to authenticated
  using ((select public.is_pak_choy_admin())) with check ((select public.is_pak_choy_admin()));

create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  versi text not null unique check (length(trim(versi)) between 1 and 32),
  platform text not null default 'all' check (platform in ('windows','macos','all')),
  tipe text not null default 'stable' check (tipe in ('stable','beta')),
  changelog text not null default '' check (length(changelog) <= 4000),
  url_download text,
  is_wajib boolean not null default false,
  tanggal_rilis date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.app_versions enable row level security;
grant select on public.app_versions to anon, authenticated;
grant insert, update, delete on public.app_versions to authenticated;
drop policy if exists "version_public_read" on public.app_versions;
create policy "version_public_read" on public.app_versions for select to anon, authenticated using (true);
drop policy if exists "version_admin_write" on public.app_versions;
create policy "version_admin_write" on public.app_versions for all to authenticated
  using ((select public.is_pak_choy_admin())) with check ((select public.is_pak_choy_admin()));

commit;
