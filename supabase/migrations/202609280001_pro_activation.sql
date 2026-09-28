-- Lisensi Pro Wali Kelas, seragam dengan pola BGY (lihat PRO-LISENSI.md).
-- Lynk → /aktvs-wk.html → bgy_request_activation_code → di aplikasi bgy_activate_pro.
-- Paket 'semester' = 6 bulan sejak aktivasi. Aman dijalankan ulang.
begin;

create table if not exists public.bgy_users (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  code text not null unique,
  access text not null,
  is_pro boolean not null default false,
  plan_type text check (plan_type in ('lifetime', 'annual', 'semester')),
  active_until timestamptz,
  purchased_at timestamptz not null default now(),
  activated_at timestamptz,
  user_id uuid references auth.users(id) on delete set null,
  unique (email, access)
);
create index if not exists bgy_users_user on public.bgy_users(user_id, access);
alter table public.bgy_users enable row level security;
revoke all on public.bgy_users from anon, authenticated;

create or replace function public.bgy_normalize_access(p_access text) returns text
language plpgsql immutable set search_path = '' as $$
declare normalized_access text := lower(trim(coalesce(p_access, '')));
begin
  if normalized_access not in ('wali_kelas') then raise exception 'Produk tidak dikenal.'; end if;
  return normalized_access;
end;
$$;

-- Aktif bila is_pro dan (bukan paket berjangka atau active_until masih di depan).
create or replace function public.bgy_row_active(r public.bgy_users) returns boolean
language sql stable set search_path = '' as $$
  select r.is_pro and (r.plan_type not in ('annual', 'semester') or r.active_until > now());
$$;

create or replace function public.bgy_request_activation_code(p_email text, p_access text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_access text := public.bgy_normalize_access(p_access);
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  existing text;
  new_code text;
  bytes bytea;
  j integer;
begin
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email tidak valid.'; end if;
  select code into existing from public.bgy_users where email = normalized_email and access = normalized_access;
  if found then return existing; end if;
  loop
    bytes := substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 5);
    new_code := 'BGY-';
    for j in 0..4 loop new_code := new_code || substr(alphabet, (get_byte(bytes, j) % 32) + 1, 1); end loop;
    begin
      insert into public.bgy_users (email, code, access) values (normalized_email, new_code, normalized_access);
      return new_code;
    exception when unique_violation then
      select code into existing from public.bgy_users where email = normalized_email and access = normalized_access;
      if found then return existing; end if;
    end;
  end loop;
end;
$$;

create or replace function public.bgy_activate_pro(p_email text, p_code text, p_access text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  normalized_access text := public.bgy_normalize_access(p_access);
  r public.bgy_users;
begin
  select * into r from public.bgy_users u
    where u.email = lower(trim(coalesce(p_email, ''))) and u.code = upper(trim(coalesce(p_code, ''))) and u.access = normalized_access
    for update;
  if not found then raise exception 'Email atau kode aktivasi tidak cocok.'; end if;
  if r.activated_at is null then
    update public.bgy_users u set is_pro = true, plan_type = 'semester', active_until = now() + interval '6 months', activated_at = now()
      where u.id = r.id returning * into r;
  elsif not public.bgy_row_active(r) then
    raise exception 'Masa Pro untuk kode ini sudah berakhir. Setelah membeli perpanjangan, hubungi admin agar masa aktif ditambah.';
  end if;
  -- Hubungkan lisensi ke akun yang sedang login agar status terbawa ke perangkat lain.
  if auth.uid() is not null then update public.bgy_users u set user_id = auth.uid() where u.id = r.id; end if;
  return query select public.bgy_row_active(r), r.plan_type, r.active_until;
end;
$$;

create or replace function public.bgy_subscription_status(p_email text, p_access text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select public.bgy_row_active(u), u.plan_type, u.active_until from public.bgy_users u
    where u.email = lower(trim(coalesce(p_email, ''))) and u.access = public.bgy_normalize_access(p_access) and u.activated_at is not null;
$$;

revoke all on function public.bgy_request_activation_code(text, text), public.bgy_activate_pro(text, text, text), public.bgy_subscription_status(text, text) from public;
grant execute on function public.bgy_request_activation_code(text, text), public.bgy_activate_pro(text, text, text), public.bgy_subscription_status(text, text) to anon, authenticated;

-- Pro di server: email pemilik, lisensi yang terhubung ke akun / sama dengan email login, atau langganan lama.
create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'choiruddin2410@gmail.com'
    or exists (
      select 1 from public.bgy_users u
      where u.access = 'wali_kelas' and public.bgy_row_active(u)
        and (u.user_id = (select auth.uid()) or u.email = lower(coalesce((select auth.jwt() ->> 'email'), '')))
    )
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = (select auth.uid()) and s.plan = 'pro' and s.status = 'active' and (s.ends_at is null or s.ends_at > now())
    );
$$;

create or replace function public.my_plan() returns table (plan text, active_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select case when public.is_pro() then 'pro' else 'free' end,
    (select max(u.active_until) from public.bgy_users u
      where u.access = 'wali_kelas' and public.bgy_row_active(u)
        and (u.user_id = (select auth.uid()) or u.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))));
$$;
revoke all on function public.my_plan() from public;
grant execute on function public.my_plan() to authenticated;

commit;
