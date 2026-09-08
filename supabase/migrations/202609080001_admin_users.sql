begin;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_pak_choy_admin() then
    raise exception 'Akses admin diperlukan.';
  end if;

  return query
  select
    users.id,
    users.email::text,
    coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name', split_part(users.email, '@', 1))::text,
    coalesce(users.raw_user_meta_data ->> 'avatar_url', users.raw_user_meta_data ->> 'picture')::text,
    coalesce(users.raw_app_meta_data ->> 'provider', 'email')::text,
    users.created_at,
    users.last_sign_in_at
  from auth.users as users
  order by users.created_at desc
  limit 500;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

commit;
