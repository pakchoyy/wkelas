-- Klaim Pro per pesanan Kreacy (satu pesanan = satu klaim), sama seperti produk BGY lain.
-- Menggantikan link klaim tunggal dari 202611040001 (link itu bisa dipakai siapa saja yang memilikinya).
-- Kreacy mengganti {order} dan {sig} di link produk; sig = HMAC-SHA256(KLAIM_HMAC_SECRET, order).
--
-- SETELAH menjalankan file ini, isi rahasia yang SAMA dengan KLAIM_HMAC_SECRET di toko (jangan buat baru):
--   insert into public.bgy_private (key, value) values ('klaim_hmac_secret', 'ISI_RAHASIA')
--   on conflict (key) do update set value = excluded.value;
-- Selama rahasia belum diisi, klaim ditolak dengan pesan "belum siap".
-- Aman dijalankan ulang.
begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.bgy_private (
  key text primary key,
  value text not null
);
alter table public.bgy_private enable row level security;
revoke all on table public.bgy_private from anon, authenticated;

create table if not exists public.bgy_order_claims (
  order_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  access text not null default 'wali_kelas',
  created_at timestamptz not null default now()
);
alter table public.bgy_order_claims enable row level security;
revoke all on table public.bgy_order_claims from anon, authenticated;

-- Link tunggal lama ditutup.
drop function if exists public.bgy_claim_pro(text);
drop function if exists public.admin_rotate_claim_secret();
drop table if exists public.bgy_claim_secrets;

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

  -- Satu pesanan hanya bisa diklaim sekali (kunci utama mencegah klaim ganda bersamaan).
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
    active_until = greatest(coalesce(u.active_until, now()), now()) + interval '6 months',
    activated_at = coalesce(u.activated_at, now()), user_id = uid
    where u.id = r.id returning * into r;
  return query select public.bgy_row_active(r), r.plan_type, r.active_until;
end;
$$;
revoke all on function public.bgy_claim_pro(text, text) from public, anon;
grant execute on function public.bgy_claim_pro(text, text) to authenticated;

commit;
