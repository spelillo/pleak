-- Pleak schema: one table per former Google Sheets tab (see the old
-- apps-script/Config.gs RESOURCES map). Columns are the snake_case form of
-- the sheet headers; src/lib/api.ts converts to and from the camelCase
-- shapes in src/lib/types.ts, so the rest of the frontend is unchanged.
--
-- Unlike the Apps Script backend (one shared secret, every row visible to
-- every caller), every table here is behind row-level security keyed off
-- the Supabase Auth session, so each user can only read and write their own
-- rows.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Allowlist (replaces ALLOWED_EMAILS in apps-script/Config.gs)
-- ---------------------------------------------------------------------------

create table public.allowed_emails (
  email text primary key check (email = lower(email))
);

alter table public.allowed_emails enable row level security;
-- No policies: only the service role / SQL editor can read or change it.

insert into public.allowed_emails (email) values ('spelillo11@gmail.com');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key default gen_random_uuid(),
  -- Supabase Auth user this profile belongs to. Null for rows imported from
  -- Sheets until that person signs in once; pleak_login() links them by email.
  auth_id uuid unique references auth.users (id) on delete set null,
  google_id text,
  email text not null unique check (email = lower(email)),
  display_name text not null,
  date_of_birth text,
  sex text,
  height double precision,
  weight double precision,
  age integer,
  streak integer,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  exercise_type text not null default 'weights',
  muscle_groups jsonb not null default '[]'::jsonb,
  movement_type text,
  instructions text,
  equipment text,
  -- Null = system exercise visible to everyone; otherwise the creator's id.
  user_id uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  exercises jsonb not null default '[]'::jsonb,
  estimated_duration integer,
  difficulty text,
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  username text,
  plan_id uuid,
  name text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  total_duration double precision,
  duration_mins double precision,
  exercises jsonb not null default '[]'::jsonb,
  is_active boolean not null default false
);

create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  category text,
  scheduled_date text,
  scheduled_day text,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  type text,
  category text,
  target_value double precision,
  current_value double precision,
  starting_value double precision,
  unit text,
  deadline text,
  status text not null default 'active',
  priority text not null default 'medium',
  exercise_id uuid,
  target_exercise_weight double precision,
  target_time double precision,
  target_distance double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  exercise_name text not null,
  exercise_type text,
  weight double precision,
  reps integer,
  duration double precision,
  distance double precision,
  achieved_at timestamptz,
  workout_session_id uuid,
  created_at timestamptz not null default now()
);

create table public.weekly_workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_plan_days (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_workout_plans (id) on delete cascade,
  -- "w"-prefixed local date key, e.g. "w2026-10-11" (see toDateKey in
  -- src/lib/weekPlanning.ts). Kept as plain text so filters match exactly.
  week_start_date text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  title text,
  is_rest_day boolean not null default false,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.weekly_plan_completions (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_workout_plans (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  week_start_date text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  session_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.exercises (user_id);
create index on public.workout_sessions (user_id);
create index on public.scheduled_workouts (user_id);
create index on public.goals (user_id);
create index on public.personal_records (user_id);
create index on public.weekly_workout_plans (user_id);
create index on public.weekly_plan_days (weekly_plan_id, week_start_date);
create index on public.weekly_plan_completions (weekly_plan_id, week_start_date);

-- updated_at bookkeeping (updateRow_ in apps-script/CrudHelpers.gs did this).
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger weekly_workout_plans_set_updated_at before update on public.weekly_workout_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

-- The public.users id of the signed-in Supabase Auth user, or null.
create function public.current_app_user_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.users where auth_id = auth.uid();
$$;

-- Called by the frontend right after sign-in (replaces handleAuthLogin_ in
-- apps-script/Auth.gs). Checks the allowlist, then returns the caller's
-- users row: an already-linked one, an imported one matched by email (and
-- linked now), or a newly created one.
create function public.pleak_login() returns public.users
language plpgsql security definer set search_path = public as $$
declare
  v_auth_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  v_user public.users;
begin
  if v_auth_id is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.allowed_emails where email = v_email) then
    raise exception 'This Google account is not allowed to sign in';
  end if;

  select * into v_user from public.users where auth_id = v_auth_id;
  if found then
    return v_user;
  end if;

  update public.users
     set auth_id = v_auth_id,
         google_id = coalesce(google_id, v_meta ->> 'provider_id', v_meta ->> 'sub')
   where email = v_email and auth_id is null
  returning * into v_user;
  if found then
    return v_user;
  end if;

  insert into public.users (auth_id, google_id, email, display_name)
  values (
    v_auth_id,
    coalesce(v_meta ->> 'provider_id', v_meta ->> 'sub'),
    v_email,
    coalesce(nullif(v_meta ->> 'full_name', ''), nullif(v_meta ->> 'name', ''), v_email)
  )
  returning * into v_user;
  return v_user;
end;
$$;

revoke execute on function public.pleak_login() from public, anon;
grant execute on function public.pleak_login() to authenticated;
revoke execute on function public.current_app_user_id() from public, anon;
grant execute on function public.current_app_user_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.goals enable row level security;
alter table public.personal_records enable row level security;
alter table public.weekly_workout_plans enable row level security;
alter table public.weekly_plan_days enable row level security;
alter table public.weekly_plan_completions enable row level security;

-- users: read and edit your own profile only. Identity columns (auth_id,
-- email, google_id) can't be changed from the client.
create policy "own profile read" on public.users
  for select to authenticated using (auth_id = auth.uid());
create policy "own profile update" on public.users
  for update to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());
revoke update on public.users from authenticated;
grant update (display_name, date_of_birth, sex, height, weight, age, streak) on public.users to authenticated;

-- exercises: system exercises (user_id null) plus your own custom ones.
create policy "exercises read" on public.exercises
  for select to authenticated using (user_id is null or user_id = public.current_app_user_id());
create policy "exercises insert own" on public.exercises
  for insert to authenticated with check (user_id = public.current_app_user_id());
create policy "exercises update own" on public.exercises
  for update to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "exercises delete own" on public.exercises
  for delete to authenticated using (user_id = public.current_app_user_id());

-- workout_plans: shared templates, read-only from the client.
create policy "workout plans read" on public.workout_plans
  for select to authenticated using (true);

-- Tables owned directly by a user_id.
create policy "own rows" on public.workout_sessions
  for all to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "own rows" on public.scheduled_workouts
  for all to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "own rows" on public.goals
  for all to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "own rows" on public.personal_records
  for all to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "own rows" on public.weekly_workout_plans
  for all to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "own rows" on public.weekly_plan_completions
  for all to authenticated using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- weekly_plan_days: owned through their weekly plan.
create policy "own plan days" on public.weekly_plan_days
  for all to authenticated
  using (exists (
    select 1 from public.weekly_workout_plans p
     where p.id = weekly_plan_id and p.user_id = public.current_app_user_id()
  ))
  with check (exists (
    select 1 from public.weekly_workout_plans p
     where p.id = weekly_plan_id and p.user_id = public.current_app_user_id()
  ));
