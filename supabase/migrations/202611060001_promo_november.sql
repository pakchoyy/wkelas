-- Promo November 2026: aktivasi/perpanjangan Pro selama November (WIB) aktif sampai 30 Juni 2027.
-- Di luar November tetap 6 bulan (atau sesuai lama yang diterbitkan admin). Aman dijalankan ulang.
begin;

-- Akhir masa Pro: tambah p_months dari p_from, tetapi tidak pernah lebih pendek dari akhir promo
-- bila aktivasi terjadi saat promo. p_now bisa diisi untuk pengujian.
create or replace function public.bgy_pro_end(p_from timestamptz, p_months integer, p_now timestamptz default now())
returns timestamptz
language sql immutable set search_path = '' as $$
  select greatest(
    p_from + make_interval(months => p_months),
    case when p_now >= timestamptz '2026-11-01 00:00:00+07' and p_now < timestamptz '2026-12-01 00:00:00+07'
         then timestamptz '2027-06-30 23:59:59+07' end
  );
$$;
revoke all on function public.bgy_pro_end(timestamptz, integer, timestamptz) from public, anon, authenticated;

-- Klaim per pesanan Kreacy (sama seperti sebelumnya, masa aktif lewat bgy_pro_end).
create or replace function public.bgy_claim_pro(p_order text, p_sig text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare
  uid uuid := auth.uid();
  caller_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_order text := left(trim(coalesce(p_order, '')), 80);
  v_sig text := lower(trim(coalesce(p_sig, '')));
  v_secret text;
  r public.bgy_users;
begin
  if uid is null or caller_email = '' then raise exception 'Masuk ke akun dulu sebelum klaim Pro.'; end if;
  if v_order = '' or v_sig !~ '^[0-9a-f]{64}$' then
    raise exception 'Link klaim tidak lengkap. Buka lagi link dari halaman pesanan.';
  end if;
  select value into v_secret from public.bgy_private where key = 'klaim_hmac_secret';
  if v_secret is null or v_secret = '' then
    raise exception 'Klaim otomatis belum siap. Hubungi admin.';
  end if;
  if v_sig <> encode(extensions.hmac(v_order, v_secret, 'sha256'), 'hex') then
    raise exception 'Link klaim tidak valid. Buka lagi link dari halaman pesanan, atau hubungi admin.';
  end if;
  begin
    insert into public.bgy_order_claims (order_id, user_id, email) values (v_order, uid, caller_email);
  exception when unique_violation then
    if exists (select 1 from public.bgy_order_claims c where c.order_id = v_order and c.user_id = uid) then
      raise exception 'Pesanan ini sudah kamu klaim sebelumnya.';
    end if;
    raise exception 'Pesanan ini sudah diklaim akun lain. Hubungi admin bila ini pesananmu.';
  end;
  perform public.bgy_request_activation_code(caller_email, 'wali_kelas');
  select * into r from public.bgy_users u where u.email = caller_email and u.access = 'wali_kelas' for update;
  if r.user_id is not null and r.user_id <> uid then
    raise exception 'Lisensi email ini terhubung ke akun lain. Hubungi admin.';
  end if;
  update public.bgy_users u set is_pro = true, plan_type = 'semester', grant_months = 6,
    active_until = public.bgy_pro_end(greatest(coalesce(u.active_until, now()), now()), 6),
    activated_at = coalesce(u.activated_at, now()), user_id = uid
    where u.id = r.id returning * into r;
  return query select public.bgy_row_active(r), r.plan_type, r.active_until;
end;
$$;
revoke all on function public.bgy_claim_pro(text, text) from public, anon;
grant execute on function public.bgy_claim_pro(text, text) to authenticated;

-- Aktivasi dengan kode dari admin.
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
      active_until = public.bgy_pro_end(now(), r.grant_months), activated_at = now(), user_id = auth.uid()
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

-- Admin menerbitkan atau memperpanjang (aktivasi manual dari panel admin).
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
      active_until = public.bgy_pro_end(greatest(coalesce(u.active_until, now()), now()), p_months)
      where u.id = r.id returning * into r;
  end if;
  return query select r.email, r.code, r.active_until, r.activated_at is not null;
end;
$$;
revoke all on function public.admin_issue_license(text, integer) from public, anon;
grant execute on function public.admin_issue_license(text, integer) to authenticated;

commit;
