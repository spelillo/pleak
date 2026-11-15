-- "Help build my plan": the split, days off, frequency and rotation anchor
-- the assistant used, so each new week can be filled in with fresh
-- exercises while the split keeps rotating (see src/lib/planBuilder.ts).
-- Null for plans built by hand.
alter table public.weekly_workout_plans add column if not exists ai_config jsonb;
