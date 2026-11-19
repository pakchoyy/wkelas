-- Ref Dokumen untuk SD–SMA: target kelas 1–12 (sebelumnya 1–6).
begin;
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.pak_choy_documents'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%target_grades%'
  loop
    execute format('alter table public.pak_choy_documents drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.pak_choy_documents add constraint pak_choy_documents_target_grades_check
  check (target_grades <@ array[1,2,3,4,5,6,7,8,9,10,11,12] and array_position(target_grades, null) is null and cardinality(target_grades) <= 12);
commit;
