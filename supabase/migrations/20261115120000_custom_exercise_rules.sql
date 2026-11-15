-- Rules for user-created (custom) exercises, mirroring the create-exercise
-- popup. System exercises (user_id is null) are not affected, and NOT VALID
-- leaves any custom rows created before this migration alone.

alter table public.exercises
  add constraint exercises_custom_name_letters_only check (
    user_id is null
    or (name ~ '^[[:alpha:]]+( [[:alpha:]]+)*$' and char_length(name) between 2 and 40)
  ) not valid;

alter table public.exercises
  add constraint exercises_custom_movement_type check (
    user_id is null or movement_type in ('Push', 'Pull', 'Legs')
  ) not valid;

alter table public.exercises
  add constraint exercises_custom_muscle_groups check (
    user_id is null
    or (jsonb_typeof(muscle_groups) = 'array' and jsonb_array_length(muscle_groups) > 0)
  ) not valid;
