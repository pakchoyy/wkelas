-- Pengetatan keamanan: admin hanya akun pemilik, role tidak bisa diubah sendiri,
-- dan masukan dibatasi panjang serta frekuensinya. Aman dijalankan ulang.
begin;

-- 1. Admin wajib terdaftar di pak_choy_admins DAN memakai email pemilik.
create or replace function public.is_pak_choy_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.pak_choy_admins where user_id = (select auth.uid()))
    and lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'choiruddin2410@gmail.com';
$$;
revoke all on function public.is_pak_choy_admin() from public;
grant execute on function public.is_pak_choy_admin() to anon, authenticated;

-- 2. Pengguna hanya boleh menulis kolom identitas profil, bukan role.
revoke insert, update on public.profiles from authenticated;
grant insert (id, email, full_name, avatar_url) on public.profiles to authenticated;
grant update (id, email, full_name, avatar_url, updated_at) on public.profiles to authenticated;
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 3. Masukan: pengguna tidak bisa mengatur status sendiri; admin hanya mengubah status.
revoke insert, update on public.feedback from authenticated;
grant insert (user_id, category, message, page, app_version) on public.feedback to authenticated;
grant update (status) on public.feedback to authenticated;

alter table public.feedback drop constraint if exists feedback_message_length;
alter table public.feedback add constraint feedback_message_length
  check (length(trim(message)) between 1 and 2000) not valid;
alter table public.feedback drop constraint if exists feedback_meta_length;
alter table public.feedback add constraint feedback_meta_length
  check (coalesce(length(page), 0) <= 200 and coalesce(length(app_version), 0) <= 32) not valid;

create or replace function public.limit_feedback_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Terlalu banyak masukan. Coba lagi dalam satu jam.';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_feedback_rate() from public;
drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit before insert on public.feedback
  for each row execute function public.limit_feedback_rate();

commit;
