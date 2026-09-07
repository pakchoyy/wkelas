begin;

create table if not exists public.pak_choy_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pak_choy_admins enable row level security;
revoke all on public.pak_choy_admins from anon, authenticated;
grant select on public.pak_choy_admins to authenticated;
drop policy if exists "choy_admin_self_read" on public.pak_choy_admins;
create policy "choy_admin_self_read" on public.pak_choy_admins for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.is_pak_choy_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.pak_choy_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_pak_choy_admin() from public;
grant execute on function public.is_pak_choy_admin() to anon, authenticated;

create table if not exists public.pak_choy_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  category text not null check (category in ('CP','ATP','Prota','Promes','RPM','Modul Ajar','LKPD','Lainnya')),
  description text not null default '' check (length(description)<=2000),
  target_grades integer[] not null default '{}' check (target_grades <@ array[1,2,3,4,5,6] and array_position(target_grades,null) is null and cardinality(target_grades)<=6),
  file_path text not null unique check (file_path ~ '^[a-f0-9-]{36}\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|png|jpg|jpeg|webp)$'),
  file_name text not null check (length(file_name) between 1 and 255),
  file_size bigint not null check (file_size>0 and file_size<=20971520),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists choy_document_grades on public.pak_choy_documents using gin(target_grades);
create index if not exists choy_document_published on public.pak_choy_documents(published,created_at desc);
alter table public.pak_choy_documents enable row level security;
revoke all on public.pak_choy_documents from anon, authenticated;
grant select on public.pak_choy_documents to anon;
grant select,insert,update,delete on public.pak_choy_documents to authenticated;

drop policy if exists "choy_document_read" on public.pak_choy_documents;
create policy "choy_document_read" on public.pak_choy_documents for select to anon,authenticated
  using (published or (select public.is_pak_choy_admin()));
drop policy if exists "choy_document_insert" on public.pak_choy_documents;
create policy "choy_document_insert" on public.pak_choy_documents for insert to authenticated
  with check ((select public.is_pak_choy_admin()));
drop policy if exists "choy_document_update" on public.pak_choy_documents;
create policy "choy_document_update" on public.pak_choy_documents for update to authenticated
  using ((select public.is_pak_choy_admin())) with check ((select public.is_pak_choy_admin()));
drop policy if exists "choy_document_delete" on public.pak_choy_documents;
create policy "choy_document_delete" on public.pak_choy_documents for delete to authenticated
  using ((select public.is_pak_choy_admin()));

-- Upload/download go through Storage API. Do not insert/delete storage.objects manually.
insert into storage.buckets (id,name,public,file_size_limit)
values ('pak-choy-documents','pak-choy-documents',false,20971520)
on conflict (id) do update set public=false,file_size_limit=20971520;

drop policy if exists "choy_file_read" on storage.objects;
create policy "choy_file_read" on storage.objects for select to anon,authenticated using (
  bucket_id='pak-choy-documents' and (
    (select public.is_pak_choy_admin()) or exists (
      select 1 from public.pak_choy_documents d where d.file_path=name and d.published
    )
  )
);
drop policy if exists "choy_file_insert" on storage.objects;
create policy "choy_file_insert" on storage.objects for insert to authenticated with check (
  bucket_id='pak-choy-documents' and (select public.is_pak_choy_admin())
);
-- No UPDATE policy: a published file cannot be overwritten in place.
drop policy if exists "choy_file_delete" on storage.objects;
create policy "choy_file_delete" on storage.objects for delete to authenticated using (
  bucket_id='pak-choy-documents' and (select public.is_pak_choy_admin()) and not exists (
    select 1 from public.pak_choy_documents d where d.file_path=name and d.published
  )
);

create or replace function public.guard_pak_choy_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP='DELETE' then
    if exists(select 1 from storage.objects where bucket_id='pak-choy-documents' and name=old.file_path) then
      raise exception 'Hapus berkas melalui Storage API sebelum menghapus data dokumen.';
    end if;
    return old;
  end if;
  if TG_OP='UPDATE' then
    if new.id<>old.id or new.file_path<>old.file_path or new.file_size<>old.file_size or new.file_name<>old.file_name then
      raise exception 'Identitas berkas tidak dapat diubah. Unggah sebagai dokumen baru.';
    end if;
    new.created_at=old.created_at;
  end if;
  if new.published and not exists(select 1 from storage.objects where bucket_id='pak-choy-documents' and name=new.file_path) then
    raise exception 'Berkas belum tersedia. Dokumen tidak dapat diterbitkan.';
  end if;
  new.updated_at=clock_timestamp();
  return new;
end;
$$;
revoke all on function public.guard_pak_choy_document() from public;
drop trigger if exists choy_document_guard on public.pak_choy_documents;
create trigger choy_document_guard before insert or update or delete on public.pak_choy_documents
  for each row execute function public.guard_pak_choy_document();

commit;
