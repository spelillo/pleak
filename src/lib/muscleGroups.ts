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

// Which way each muscle group usually moves, so the create-exercise popup
// can fill in the movement type once muscles are picked. Core has no lean.
const MOVEMENT_BY_MUSCLE: Record<string, "Push" | "Pull" | "Legs"> = {
  Chest: "Push",
  Shoulders: "Push",
  Triceps: "Push",
  "Rear Shoulders": "Pull",
  Back: "Pull",
  Traps: "Pull",
  Biceps: "Pull",
  Forearms: "Pull",
  Quads: "Legs",
  Hamstrings: "Legs",
  Glutes: "Legs",
  Calves: "Legs",
};

/** The movement type most of these muscle groups point to, if any. */
export function inferMovementType(muscleGroups: string[]): "Push" | "Pull" | "Legs" | null {
  const counts = new Map<string, number>();
  for (const mg of muscleGroups) {
    const movement = MOVEMENT_BY_MUSCLE[mg];
    if (movement) counts.set(movement, (counts.get(movement) ?? 0) + 1);
  }
  let best: "Push" | "Pull" | "Legs" | null = null;
  let bestCount = 0;
  for (const mg of muscleGroups) {
    const movement = MOVEMENT_BY_MUSCLE[mg];
    if (movement && (counts.get(movement) ?? 0) > bestCount) {
      best = movement;
      bestCount = counts.get(movement) ?? 0;
    }
  }
  return best;
}
