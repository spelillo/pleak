import type { Exercise, WorkoutExercise, WorkoutSet } from "@/lib/types";

export const PRIMARY_TARGETS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Glutes", "Core"] as const;
export type PrimaryTarget = (typeof PRIMARY_TARGETS)[number];

export const MOVEMENT_TYPES = ["Push", "Pull", "Legs"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const DEFAULT_EXERCISE_COUNT = 5;
export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const WEIGHT_INCREMENT = 5;
export const REPS_INCREMENT = 1;
export const MINUTES_PER_SET_ESTIMATE = 3.5;

// Buckets the fine-grained muscle groups seeded on weightlifting exercises
// into the seven broad "primary target" categories.
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

export interface WorkoutTypeOption {
  id: string;
  label: string;
  description: string;
  movementType?: MovementType;
  targets?: PrimaryTarget[];
}

// The five workout types offered on the setup screen. Push/Pull/Legs match
// on the exercise's movementType tag; the muscle-group splits match on any
// of their listed primary targets.
export const WORKOUT_TYPES: WorkoutTypeOption[] = [
  { id: "push", label: "Push", description: "Chest, shoulders, triceps", movementType: "Push" },
  { id: "pull", label: "Pull", description: "Back, biceps", movementType: "Pull" },
  { id: "legs", label: "Legs", description: "Quads, hamstrings, glutes", movementType: "Legs" },
  { id: "chest-back", label: "Chest/Back", description: "Upper body focus", targets: ["Chest", "Back"] },
  { id: "arms", label: "Arms", description: "Biceps, triceps", targets: ["Arms"] },
];

export function matchesWorkoutType(exercise: Exercise, type: WorkoutTypeOption): boolean {
  if (exercise.category !== "weightlifting") return false;
  if (type.movementType) return exercise.movementType === type.movementType;
  return (type.targets ?? []).some((target) =>
    exercise.muscleGroups.some((mg) => muscleGroupToTarget(mg) === target),
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
  type: WorkoutTypeOption,
  count: number = DEFAULT_EXERCISE_COUNT,
): WorkoutExercise[] {
  const matching = pool.filter((ex) => matchesWorkoutType(ex, type));
  return shuffle(matching)
    .slice(0, count)
    .map(toWorkoutExercise);
}

export function estimateDurationMinutes(exercises: WorkoutExercise[]): number {
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  return Math.max(5, Math.round((totalSets * MINUTES_PER_SET_ESTIMATE) / 5) * 5);
}
