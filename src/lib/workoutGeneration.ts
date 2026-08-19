import type { Exercise, WorkoutExercise, WorkoutSet } from "@/lib/types";

export const PRIMARY_TARGETS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Glutes", "Core"] as const;
export type PrimaryTarget = (typeof PRIMARY_TARGETS)[number];

export const MOVEMENT_TYPES = ["Push", "Pull", "Legs"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type WorkoutSelection =
  | { kind: "target"; value: PrimaryTarget }
  | { kind: "movement"; value: MovementType };

export const DEFAULT_EXERCISE_COUNT = 5;
export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const WEIGHT_INCREMENT = 5;

// Buckets the fine-grained muscle groups seeded on weightlifting exercises
// into the seven broad "primary target" categories the setup screen offers.
const MUSCLE_GROUP_TO_TARGET: Record<string, PrimaryTarget> = {
  Chest: "Chest",
  Back: "Back",
  Shoulders: "Shoulders",
  "Rear Shoulders": "Shoulders",
  Triceps: "Arms",
  Biceps: "Arms",
  Quads: "Legs",
  Hamstrings: "Legs",
  Glutes: "Glutes",
  Core: "Core",
};

export function muscleGroupToTarget(muscleGroup: string): PrimaryTarget | null {
  return MUSCLE_GROUP_TO_TARGET[muscleGroup] ?? null;
}

export function matchesTarget(exercise: Exercise, target: PrimaryTarget): boolean {
  return (
    exercise.category === "weightlifting" &&
    exercise.muscleGroups.some((mg) => muscleGroupToTarget(mg) === target)
  );
}

export function matchesMovement(exercise: Exercise, movement: MovementType): boolean {
  return exercise.category === "weightlifting" && exercise.movementType === movement;
}

export function selectionLabel(selection: WorkoutSelection): string {
  return selection.value;
}

export function filterBySelection(pool: Exercise[], selection: WorkoutSelection): Exercise[] {
  return pool.filter((ex) =>
    selection.kind === "target" ? matchesTarget(ex, selection.value) : matchesMovement(ex, selection.value),
  );
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildDefaultSets(
  exerciseType: string,
  count: number = DEFAULT_SETS,
  reps: number = DEFAULT_REPS,
  weight?: number,
): WorkoutSet[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({
    setNumber: i + 1,
    ...(exerciseType === "cardio" ? {} : { reps, weight }),
    completed: false,
  }));
}

export function toWorkoutExercise(exercise: Exercise): WorkoutExercise {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    exerciseType: exercise.exerciseType,
    sets: buildDefaultSets(exercise.exerciseType),
  };
}

export function generateDraftExercises(
  pool: Exercise[],
  selection: WorkoutSelection,
  count: number = DEFAULT_EXERCISE_COUNT,
): WorkoutExercise[] {
  const matching = filterBySelection(pool, selection);
  return shuffle(matching)
    .slice(0, count)
    .map(toWorkoutExercise);
}
