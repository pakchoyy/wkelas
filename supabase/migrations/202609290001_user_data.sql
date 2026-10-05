-- Data per user: satu baris JSON backup penuh per akun.
-- Pengganti file snapshot di bucket user-sync (dipensiunkan bertahap).
-- Butuh migrasi 202609270002 (fungsi public.is_pro) sudah jalan. Aman dijalankan ulang.
begin;

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  fingerprint text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
revoke all on public.user_data from anon, authenticated;
grant select, insert, update, delete on public.user_data to authenticated;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data for select to authenticated
  using (auth.uid() = user_id and (select public.is_pro()));
drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data for insert to authenticated
  with check (auth.uid() = user_id and (select public.is_pro()));
drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data for update to authenticated
  using (auth.uid() = user_id and (select public.is_pro()))
  with check (auth.uid() = user_id and (select public.is_pro()));
drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own" on public.user_data for delete to authenticated
  using (auth.uid() = user_id and (select public.is_pro()));

commit;
