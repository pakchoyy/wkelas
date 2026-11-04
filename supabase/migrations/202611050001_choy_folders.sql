-- Folder bertingkat untuk Dokumen Pak Choy + item berupa link.
-- Folder -> subfolder -> file/link. Dokumen lama tetap ada dan tampil di tingkat paling atas.
-- Aman dijalankan ulang.
begin;

create table if not exists public.pak_choy_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.pak_choy_folders(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists choy_folder_parent on public.pak_choy_folders(parent_id);
-- Nama folder unik di dalam folder yang sama.
create unique index if not exists choy_folder_unique_name
  on public.pak_choy_folders (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)));

alter table public.pak_choy_folders enable row level security;
revoke all on public.pak_choy_folders from anon, authenticated;
grant select on public.pak_choy_folders to anon;
grant select, insert, update, delete on public.pak_choy_folders to authenticated;
drop policy if exists "choy_folder_read" on public.pak_choy_folders;
create policy "choy_folder_read" on public.pak_choy_folders for select to anon, authenticated using (true);
drop policy if exists "choy_folder_write" on public.pak_choy_folders;
create policy "choy_folder_write" on public.pak_choy_folders for all to authenticated
  using ((select public.is_pak_choy_admin())) with check ((select public.is_pak_choy_admin()));

-- Folder tidak boleh menjadi anak dirinya sendiri, dan kedalaman maksimal 6 tingkat.
create or replace function public.guard_pak_choy_folder() returns trigger
language plpgsql set search_path = '' as $$
declare levels integer := 0; cyc boolean := false;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then raise exception 'Folder tidak bisa dimasukkan ke dirinya sendiri.'; end if;
    with recursive up as (
      select f.id, f.parent_id, 1 as d from public.pak_choy_folders f where f.id = new.parent_id
      union all
      select f.id, f.parent_id, up.d + 1 from public.pak_choy_folders f join up on f.id = up.parent_id where up.d < 20
    )
    select coalesce(max(d), 0), coalesce(bool_or(id = new.id), false) into levels, cyc from up;
    if cyc then raise exception 'Folder tidak bisa dimasukkan ke dalam subfoldernya sendiri.'; end if;
    if levels >= 6 then raise exception 'Folder terlalu dalam (maksimal 6 tingkat).'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists choy_folder_guard on public.pak_choy_folders;
create trigger choy_folder_guard before insert or update of parent_id on public.pak_choy_folders
  for each row execute function public.guard_pak_choy_folder();

-- Dokumen: bisa berada di folder, dan bisa berupa link (tanpa berkas).
alter table public.pak_choy_documents add column if not exists folder_id uuid references public.pak_choy_folders(id) on delete restrict;
alter table public.pak_choy_documents add column if not exists link_url text
  check (link_url is null or (link_url ~ '^https://[^[:space:]]+$' and length(link_url) <= 1000));
create index if not exists choy_document_folder on public.pak_choy_documents(folder_id);

alter table public.pak_choy_documents alter column file_path drop not null;
alter table public.pak_choy_documents alter column file_name drop not null;
alter table public.pak_choy_documents alter column file_size drop not null;
alter table public.pak_choy_documents drop constraint if exists choy_document_file_or_link;
alter table public.pak_choy_documents add constraint choy_document_file_or_link
  check ((link_url is not null and file_path is null and file_name is null and file_size is null)
      or (link_url is null and file_path is not null and file_name is not null and file_size is not null));

-- Pengaman dokumen: item link tidak punya berkas di Storage.
create or replace function public.guard_pak_choy_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP='DELETE' then
    if old.file_path is not null and exists(select 1 from storage.objects where bucket_id='pak-choy-documents' and name=old.file_path) then
      raise exception 'Hapus berkas melalui Storage API sebelum menghapus data dokumen.';
    end if;
    return old;
  end if;
  if TG_OP='UPDATE' then
    if new.id<>old.id or new.file_path is distinct from old.file_path or new.file_size is distinct from old.file_size or new.file_name is distinct from old.file_name then
      raise exception 'Identitas berkas tidak dapat diubah. Unggah sebagai dokumen baru.';
    end if;
    new.created_at=old.created_at;
  end if;
  if new.published and new.file_path is not null
     and not exists(select 1 from storage.objects where bucket_id='pak-choy-documents' and name=new.file_path) then
    raise exception 'Berkas belum tersedia. Dokumen tidak dapat diterbitkan.';
  end if;
  new.updated_at=clock_timestamp();
  return new;
end;
$$;
revoke all on function public.guard_pak_choy_document() from public;

commit;
