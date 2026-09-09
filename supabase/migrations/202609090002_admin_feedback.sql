begin;

grant insert on public.profiles to authenticated;
drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles for insert to authenticated
  with check (auth.uid() = id);

grant select, update on public.feedback to authenticated;
drop policy if exists "feedback_admin_read" on public.feedback;
create policy "feedback_admin_read" on public.feedback for select to authenticated
  using ((select public.is_pak_choy_admin()));
drop policy if exists "feedback_admin_update" on public.feedback;
create policy "feedback_admin_update" on public.feedback for update to authenticated
  using ((select public.is_pak_choy_admin()))
  with check ((select public.is_pak_choy_admin()));

commit;
