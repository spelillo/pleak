-- Custom exercises are private to the person who made it: re-applies the
-- exercises row-level security policies so every database has exactly
-- these, whatever state it's in. System exercises (user_id is null) stay
-- visible to everyone; custom ones can only be seen, edited or deleted by
-- their owner, and nobody can create, edit into, or delete a system row.
-- Safe to run more than once.

alter table public.exercises enable row level security;

drop policy if exists "exercises read" on public.exercises;
create policy "exercises read" on public.exercises
  for select to authenticated using (user_id is null or user_id = public.current_app_user_id());

drop policy if exists "exercises insert own" on public.exercises;
create policy "exercises insert own" on public.exercises
  for insert to authenticated with check (user_id = public.current_app_user_id());

drop policy if exists "exercises update own" on public.exercises;
create policy "exercises update own" on public.exercises
  for update to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists "exercises delete own" on public.exercises;
create policy "exercises delete own" on public.exercises
  for delete to authenticated using (user_id = public.current_app_user_id());

-- Signed-out visitors can't read the table at all.
revoke all on public.exercises from anon;
