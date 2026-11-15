// The muscle group vocabulary shared by the seeded exercise library and the
// create-exercise popup. Keep these names in sync with the seed data and with
// MUSCLE_GROUP_TO_TARGET in workoutGeneration.ts so filters and workout
// generation treat custom and system exercises the same way.
export const MUSCLE_GROUPS = [
  "Chest",
  "Shoulders",
  "Rear Shoulders",
  "Triceps",
  "Back",
  "Traps",
  "Biceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
] as const;
