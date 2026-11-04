-- Pengamanan sebelum menerima pembayaran Pro. Butuh migrasi 202609280001 dan 202609290001.
-- 1. Kode aktivasi hanya diterbitkan admin setelah pembayaran terverifikasi.
-- 2. Aktivasi wajib login dengan email yang sama dengan email lisensi.
-- 3. Data cloud tetap bisa dibaca/diunduh walau Pro habis; menulis tetap khusus Pro.
-- 4. Simpan data cloud bersyarat agar dua perangkat tidak saling menimpa.
-- Aman dijalankan ulang.
begin;

-- ---------- Lisensi ----------
-- grant_months terisi = pembayaran sudah dikonfirmasi admin. Baris lama yang belum
-- diaktivasi (dibuat lewat halaman publik) tidak bisa diaktifkan sampai admin menerbitkannya.
alter table public.bgy_users add column if not exists grant_months integer
  check (grant_months is null or grant_months between 1 and 24);

-- Pembuat kode tidak lagi bisa dipanggil dari browser.
revoke execute on function public.bgy_request_activation_code(text, text) from public, anon, authenticated;

create or replace function public.bgy_activate_pro(p_email text, p_code text, p_access text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  normalized_access text := public.bgy_normalize_access(p_access);
  normalized_email text := lower(trim(coalesce(p_email, '')));
  caller_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  r public.bgy_users;
begin
  if auth.uid() is null then raise exception 'Masuk ke akun dulu sebelum aktivasi.'; end if;
  if normalized_email <> caller_email then
    raise exception 'Email lisensi harus sama dengan email akun yang sedang masuk.';
  end if;
  select * into r from public.bgy_users u
    where u.email = normalized_email and u.code = upper(trim(coalesce(p_code, ''))) and u.access = normalized_access
    for update;
  if not found then raise exception 'Email atau kode aktivasi tidak cocok.'; end if;
  if r.user_id is not null and r.user_id <> auth.uid() then
    raise exception 'Kode ini sudah dipakai akun lain. Hubungi admin.';
  end if;
  if r.activated_at is null then
    if r.grant_months is null then
      raise exception 'Kode belum aktif. Hubungi admin setelah pembayaran terverifikasi.';
    end if;
    update public.bgy_users u set is_pro = true, plan_type = 'semester',
      active_until = now() + make_interval(months => r.grant_months), activated_at = now(), user_id = auth.uid()
      where u.id = r.id returning * into r;
  elsif not public.bgy_row_active(r) then
    raise exception 'Masa Pro untuk kode ini sudah berakhir. Setelah membeli perpanjangan, hubungi admin agar masa aktif ditambah.';
  elsif r.user_id is null then
    update public.bgy_users u set user_id = auth.uid() where u.id = r.id returning * into r;
  end if;
  return query select public.bgy_row_active(r), r.plan_type, r.active_until;
end;
$$;
revoke all on function public.bgy_activate_pro(text, text, text) from public, anon;
grant execute on function public.bgy_activate_pro(text, text, text) to authenticated;

-- Status hanya untuk email akun sendiri (tidak bisa mengintip email orang lain).
create or replace function public.bgy_subscription_status(p_email text, p_access text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select public.bgy_row_active(u), u.plan_type, u.active_until from public.bgy_users u
    where u.email = lower(trim(coalesce(p_email, '')))
      and u.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and u.access = public.bgy_normalize_access(p_access) and u.activated_at is not null;
$$;
revoke all on function public.bgy_subscription_status(text, text) from public, anon;
grant execute on function public.bgy_subscription_status(text, text) to authenticated;

-- Admin menerbitkan kode baru, atau memperpanjang lisensi yang sudah aktif.
create or replace function public.admin_issue_license(p_email text, p_months integer default 6)
returns table (email text, code text, active_until timestamptz, activated boolean)
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  r public.bgy_users;
begin
  if not public.is_pak_choy_admin() then raise exception 'Akses admin diperlukan.'; end if;
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email tidak valid.'; end if;
  if p_months is null or p_months < 1 or p_months > 24 then raise exception 'Lama Pro harus 1–24 bulan.'; end if;
  perform public.bgy_request_activation_code(normalized_email, 'wali_kelas');
  select * into r from public.bgy_users u where u.email = normalized_email and u.access = 'wali_kelas' for update;
  if r.activated_at is null then
    update public.bgy_users u set grant_months = p_months where u.id = r.id returning * into r;
  else
    update public.bgy_users u set is_pro = true, grant_months = p_months,
      active_until = greatest(coalesce(u.active_until, now()), now()) + make_interval(months => p_months)
      where u.id = r.id returning * into r;
  end if;
  return query select r.email, r.code, r.active_until, r.activated_at is not null;
end;
$$;

-- Cabut lisensi (misalnya setelah refund). Data pengguna tidak disentuh.
create or replace function public.admin_revoke_license(p_email text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_pak_choy_admin() then raise exception 'Akses admin diperlukan.'; end if;
  update public.bgy_users u set is_pro = false, grant_months = null,
    active_until = least(coalesce(u.active_until, now()), now())
    where u.email = lower(trim(coalesce(p_email, ''))) and u.access = 'wali_kelas';
  if not found then raise exception 'Lisensi untuk email ini tidak ditemukan.'; end if;
end;
$$;

create or replace function public.admin_list_licenses()
returns table (email text, code text, is_active boolean, paid boolean, active_until timestamptz,
  activated_at timestamptz, purchased_at timestamptz, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_pak_choy_admin() then raise exception 'Akses admin diperlukan.'; end if;
  return query select u.email, u.code, public.bgy_row_active(u), (u.grant_months is not null or u.activated_at is not null),
    u.active_until, u.activated_at, u.purchased_at, u.user_id
    from public.bgy_users u where u.access = 'wali_kelas'
    order by coalesce(u.activated_at, u.purchased_at) desc limit 1000;
end;
$$;
revoke all on function public.admin_issue_license(text, integer), public.admin_revoke_license(text), public.admin_list_licenses() from public, anon;
grant execute on function public.admin_issue_license(text, integer), public.admin_revoke_license(text), public.admin_list_licenses() to authenticated;

-- ---------- Link klaim setelah pembayaran (Kreacy) ----------
-- Link klaim di halaman pesanan membawa token rahasia; server hanya menyimpan hash-nya.
-- Satu token hanya bisa dipakai sekali per akun. Ganti token tiap semester/bila bocor
-- lewat panel admin (admin_rotate_claim_secret), lalu tempel link barunya di produk Kreacy.
create table if not exists public.bgy_claim_secrets (
  access text primary key,
  secret_hash text not null check (secret_hash ~ '^[a-f0-9]{64}$'),
  rotated_at timestamptz not null default now()
);
alter table public.bgy_claim_secrets enable row level security;
revoke all on public.bgy_claim_secrets from anon, authenticated;
insert into public.bgy_claim_secrets (access, secret_hash)
values ('wali_kelas', '07e0fbe445753d390a19a65634c61b6724610d5f81e564dc6d2ac7879e49d5bd')
on conflict (access) do nothing;

alter table public.bgy_users add column if not exists claimed_secret_hash text;

create or replace function public.bgy_claim_pro(p_token text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  caller_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  token_hash text := encode(sha256(convert_to(trim(coalesce(p_token, '')), 'UTF8')), 'hex');
  r public.bgy_users;
begin
  if uid is null or caller_email = '' then raise exception 'Masuk ke akun dulu sebelum klaim Pro.'; end if;
  if not exists (select 1 from public.bgy_claim_secrets s where s.access = 'wali_kelas' and s.secret_hash = token_hash) then
    raise exception 'Link klaim tidak berlaku. Buka lagi link dari halaman pesanan, atau hubungi admin.';
  end if;
  perform public.bgy_request_activation_code(caller_email, 'wali_kelas');
  select * into r from public.bgy_users u where u.email = caller_email and u.access = 'wali_kelas' for update;
  if r.user_id is not null and r.user_id <> uid then raise exception 'Lisensi email ini terhubung ke akun lain. Hubungi admin.'; end if;
  if r.claimed_secret_hash = token_hash then
    raise exception 'Link klaim ini sudah kamu pakai. Untuk perpanjangan, beli lagi lalu pakai link klaim yang baru.';
  end if;
  update public.bgy_users u set is_pro = true, plan_type = 'semester', grant_months = 6,
    active_until = greatest(coalesce(u.active_until, now()), now()) + interval '6 months',
    activated_at = coalesce(u.activated_at, now()), user_id = uid, claimed_secret_hash = token_hash
    where u.id = r.id returning * into r;
  return query select public.bgy_row_active(r), r.plan_type, r.active_until;
end;
$$;
revoke all on function public.bgy_claim_pro(text) from public, anon;
grant execute on function public.bgy_claim_pro(text) to authenticated;

create or replace function public.admin_rotate_claim_secret()
returns text
language plpgsql security definer set search_path = '' as $$
declare token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_pak_choy_admin() then raise exception 'Akses admin diperlukan.'; end if;
  insert into public.bgy_claim_secrets (access, secret_hash, rotated_at)
    values ('wali_kelas', encode(sha256(convert_to(token, 'UTF8')), 'hex'), now())
    on conflict (access) do update set secret_hash = excluded.secret_hash, rotated_at = excluded.rotated_at;
  return token;
end;
$$;
revoke all on function public.admin_rotate_claim_secret() from public, anon;
grant execute on function public.admin_rotate_claim_secret() to authenticated;

-- ---------- Status Pro ----------
drop function if exists public.my_plan();
create function public.my_plan() returns table (plan text, active_until timestamptz, source text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select (select auth.uid()) as uid, lower(coalesce((select auth.jwt() ->> 'email'), '')) as email
  ), lic as (
    select max(u.active_until) as until, bool_or(u.plan_type = 'lifetime') as lifetime
    from public.bgy_users u, me
    where u.access = 'wali_kelas' and public.bgy_row_active(u) and (u.user_id = me.uid or u.email = me.email)
  ), sub as (
    select max(coalesce(s.ends_at, 'infinity'::timestamptz)) as until
    from public.subscriptions s, me
    where s.user_id = me.uid and s.plan = 'pro' and s.status = 'active' and (s.ends_at is null or s.ends_at > now())
  )
  select
    case when public.is_pro() then 'pro' else 'free' end,
    case when lic.lifetime then null else coalesce(lic.until, nullif(sub.until, 'infinity'::timestamptz)) end,
    case
      when me.email = 'choiruddin2410@gmail.com' then 'pemilik'
      when lic.until is not null or lic.lifetime then 'lisensi'
      when sub.until is not null then 'langganan'
    end
  from me, lic, sub;
$$;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- Daftar pengguna untuk admin, lengkap dengan status Pro.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (user_id uuid, email text, full_name text, avatar_url text, provider text,
  created_at timestamptz, last_sign_in_at timestamptz, plan text, pro_until timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_pak_choy_admin() then raise exception 'Akses admin diperlukan.'; end if;
  return query
  select
    users.id,
    users.email::text,
    coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name', split_part(users.email, '@', 1))::text,
    coalesce(users.raw_user_meta_data ->> 'avatar_url', users.raw_user_meta_data ->> 'picture')::text,
    coalesce(users.raw_app_meta_data ->> 'provider', 'email')::text,
    users.created_at,
    users.last_sign_in_at,
    case
      when lower(users.email) = 'choiruddin2410@gmail.com' or lic.until is not null or sub.active then 'pro'
      else 'free'
    end,
    lic.until
  from auth.users as users
  left join lateral (
    select max(u.active_until) as until from public.bgy_users u
    where u.access = 'wali_kelas' and public.bgy_row_active(u)
      and (u.user_id = users.id or u.email = lower(users.email))
  ) lic on true
  left join lateral (
    select true as active from public.subscriptions s
    where s.user_id = users.id and s.plan = 'pro' and s.status = 'active' and (s.ends_at is null or s.ends_at > now())
    limit 1
  ) sub on true
  order by users.created_at desc
  limit 500;
end;
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------- Data cloud ----------
-- Membaca dan menghapus data sendiri selalu boleh (data tidak tersandera saat Pro habis).
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own" on public.user_data for delete to authenticated
  using (auth.uid() = user_id);

alter table public.user_data drop constraint if exists user_data_size;
alter table public.user_data add constraint user_data_size
  check (octet_length(data::text) <= 20971520) not valid;

-- Simpan hanya bila salinan cloud masih versi yang dikenal perangkat ini.
create or replace function public.push_user_data(p_data jsonb, p_fingerprint text, p_expected timestamptz)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  current_at timestamptz;
  new_at timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'Login diperlukan.'; end if;
  if not public.is_pro() then raise exception 'Sinkron cloud khusus Pro.'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'Data sinkron tidak valid.'; end if;
  if octet_length(p_data::text) > 20971520 then raise exception 'Data terlalu besar untuk sinkron (maksimal 20 MB).'; end if;
  select d.updated_at into current_at from public.user_data d where d.user_id = uid for update;
  if found then
    if p_expected is null or current_at <> p_expected then raise exception 'SYNC_CONFLICT'; end if;
    update public.user_data d set data = p_data, fingerprint = left(coalesce(p_fingerprint, ''), 128), updated_at = new_at
      where d.user_id = uid;
  else
    begin
      insert into public.user_data (user_id, data, fingerprint, updated_at)
        values (uid, p_data, left(coalesce(p_fingerprint, ''), 128), new_at);
    exception when unique_violation then
      raise exception 'SYNC_CONFLICT';
    end;
  end if;
  return new_at;
end;
$$;
revoke all on function public.push_user_data(jsonb, text, timestamptz) from public, anon;
grant execute on function public.push_user_data(jsonb, text, timestamptz) to authenticated;

commit;
