-- Sinkron per tabel: kirim/ambil hanya tabel yang berubah (hemat kuota).
-- Baris user_data tetap satu per user; data->'tables' digabung per tabel.
begin;

alter table public.user_data add column if not exists table_fps jsonb not null default '{}'::jsonb;

create or replace function public.push_user_data_parts(p_parts jsonb, p_table_fps jsonb, p_fingerprint text, p_expected timestamptz)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  current_at timestamptz;
  new_at timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'Login diperlukan.'; end if;
  if not public.is_pro() then raise exception 'Sinkron cloud khusus Pro.'; end if;
  if p_parts is null or jsonb_typeof(p_parts) <> 'object' then raise exception 'Data sinkron tidak valid.'; end if;
  if p_table_fps is null or jsonb_typeof(p_table_fps) <> 'object' then raise exception 'Data sinkron tidak valid.'; end if;
  if octet_length(p_parts::text) > 20971520 then raise exception 'Data terlalu besar untuk sinkron (maksimal 20 MB).'; end if;
  select d.updated_at into current_at from public.user_data d where d.user_id = uid for update;
  if found then
    if p_expected is null or current_at <> p_expected then raise exception 'SYNC_CONFLICT'; end if;
    update public.user_data d set
      data = jsonb_set(coalesce(d.data, '{}'::jsonb) || jsonb_build_object('format', 'bgy-wali-kelas-backup', 'version', 1, 'createdAt', new_at),
                       '{tables}', coalesce(d.data->'tables', '{}'::jsonb) || p_parts),
      table_fps = p_table_fps,
      fingerprint = left(coalesce(p_fingerprint, ''), 128),
      updated_at = new_at
      where d.user_id = uid;
    if octet_length((select d.data::text from public.user_data d where d.user_id = uid)) > 20971520 then
      raise exception 'Data terlalu besar untuk sinkron (maksimal 20 MB).';
    end if;
  else
    begin
      insert into public.user_data (user_id, data, table_fps, fingerprint, updated_at)
        values (uid, jsonb_build_object('format', 'bgy-wali-kelas-backup', 'version', 1, 'createdAt', new_at, 'tables', p_parts),
                p_table_fps, left(coalesce(p_fingerprint, ''), 128), new_at);
    exception when unique_violation then
      raise exception 'SYNC_CONFLICT';
    end;
  end if;
  return new_at;
end;
$$;
revoke all on function public.push_user_data_parts(jsonb, jsonb, text, timestamptz) from public, anon;
grant execute on function public.push_user_data_parts(jsonb, jsonb, text, timestamptz) to authenticated;

-- Kirim penuh (aplikasi versi lama): sidik jari per tabel dikosongkan agar klien baru mengambil penuh.
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
    update public.user_data d set data = p_data, table_fps = '{}'::jsonb, fingerprint = left(coalesce(p_fingerprint, ''), 128), updated_at = new_at
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
