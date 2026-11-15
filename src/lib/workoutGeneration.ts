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
  Calves: "Legs",
  Forearms: "Arms",
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
  // The fine-grained muscle groups a day of this type is spread across,
  // in priority order. generateDraftExercises splits the day's exercises
  // between them as evenly as possible (see balanceQuotas), counting each
  // exercise by its primary (first-listed) muscle group, so a Push day is
  // never five chest movements.
  balanceGroups?: string[];
}

// The five workout types offered on the setup screen. Push/Pull/Legs match
// on the exercise's movementType tag; the muscle-group splits match on any
// of their listed primary targets.
export const WORKOUT_TYPES: WorkoutTypeOption[] = [
  {
    id: "push",
    label: "Push",
    description: "Chest, shoulders, triceps",
    movementType: "Push",
    balanceGroups: ["Chest", "Shoulders", "Triceps"],
  },
  {
    id: "pull",
    label: "Pull",
    description: "Back, biceps",
    movementType: "Pull",
    balanceGroups: ["Back", "Biceps"],
  },
  {
    id: "legs",
    label: "Legs",
    description: "Quads, hamstrings, calves",
    movementType: "Legs",
    balanceGroups: ["Quads", "Hamstrings", "Calves"],
  },
  {
    id: "chest-back",
    label: "Chest/Back",
    description: "Upper body focus",
    targets: ["Chest", "Back"],
    balanceGroups: ["Chest", "Back"],
  },
  {
    id: "arms",
    label: "Arms",
    description: "Biceps, triceps, shoulders",
    targets: ["Arms", "Shoulders"],
    balanceGroups: ["Biceps", "Triceps", "Shoulders"],
  },
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

// Fine-grained groups for each broad target, used to balance custom split
// days that are defined by targets rather than a preset type.
const TARGET_TO_BALANCE_GROUPS: Record<PrimaryTarget, string[]> = {
  Chest: ["Chest"],
  Back: ["Back"],
  Shoulders: ["Shoulders"],
  Arms: ["Biceps", "Triceps"],
  Legs: ["Quads", "Hamstrings", "Calves"],
  Glutes: ["Glutes"],
  Core: ["Core"],
};

const MOVEMENT_BALANCE_GROUPS: Record<MovementType, string[]> = {
  Push: ["Chest", "Shoulders", "Triceps"],
  Pull: ["Back", "Biceps"],
  Legs: ["Quads", "Hamstrings", "Calves"],
};

export const MAX_EXERCISES_PER_DAY = 7;

export function balanceGroupsFor(type: WorkoutTypeOption): string[] {
  if (type.balanceGroups?.length) return type.balanceGroups;
  if (type.movementType) return MOVEMENT_BALANCE_GROUPS[type.movementType];
  return [...new Set((type.targets ?? []).flatMap((t) => TARGET_TO_BALANCE_GROUPS[t] ?? []))];
}

export function primaryMuscleGroup(exercise: Pick<Exercise, "muscleGroups">): string | undefined {
  return exercise.muscleGroups[0];
}

/**
 * How many exercises each group gets: as even as possible, with the
 * leftovers going to the earlier (higher-priority) groups. 5 exercises
 * over Chest/Shoulders/Triceps is 2/2/1; over Back/Biceps it's 3/2.
 */
export function balanceQuotas(groups: string[], count: number): Record<string, number> {
  const quotas: Record<string, number> = {};
  groups.forEach((g, i) => {
    quotas[g] = Math.floor(count / groups.length) + (i < count % groups.length ? 1 : 0);
  });
  return quotas;
}

export function exerciseCountFor(type: WorkoutTypeOption, count: number = DEFAULT_EXERCISE_COUNT): number {
  return Math.min(MAX_EXERCISES_PER_DAY, Math.max(count, balanceGroupsFor(type).length));
}

/**
 * Picks a day's exercises from `pool` so they're spread across the type's
 * balance groups per balanceQuotas. `preferred` (e.g. the AI's picks) is
 * honored in order wherever it fits a group that still has room; every
 * remaining slot is filled with a random exercise from whichever group is
 * short. Only if a group has nothing left to give does a slot go to the
 * least-used group, so the day still comes out full.
 */
export function pickBalancedExercises(
  pool: Exercise[],
  type: WorkoutTypeOption,
  preferred: Exercise[] = [],
  count: number = DEFAULT_EXERCISE_COUNT,
): Exercise[] {
  const matching = pool.filter((ex) => matchesWorkoutType(ex, type));
  const groups = balanceGroupsFor(type);
  const total = exerciseCountFor(type, count);
  const quotas = balanceQuotas(groups, total);
  const used: Record<string, number> = Object.fromEntries(groups.map((g) => [g, 0]));
  const picked: Exercise[] = [];
  const pickedIds = new Set<string>();
  const take = (ex: Exercise) => {
    picked.push(ex);
    pickedIds.add(ex.id);
    const g = primaryMuscleGroup(ex);
    if (g && g in used) used[g]++;
  };

  for (const ex of preferred) {
    if (picked.length >= total || pickedIds.has(ex.id) || !matchesWorkoutType(ex, type)) continue;
    const g = primaryMuscleGroup(ex);
    if (g && g in quotas && used[g] < quotas[g]) take(ex);
  }

  for (const g of groups) {
    const candidates = shuffle(matching.filter((ex) => primaryMuscleGroup(ex) === g && !pickedIds.has(ex.id)));
    for (const ex of candidates) {
      if (used[g] >= quotas[g]) break;
      take(ex);
    }
  }

  // A group ran out of exercises: give its slots to the least-used groups
  // that still have some, then to anything else matching the split.
  while (picked.length < total) {
    const byNeed = [...groups].sort((a, b) => used[a] - used[b]);
    let added = false;
    for (const g of byNeed) {
      const ex = shuffle(matching.filter((e) => primaryMuscleGroup(e) === g && !pickedIds.has(e.id)))[0];
      if (ex) {
        take(ex);
        added = true;
        break;
      }
    }
    if (!added) {
      const ex = shuffle(matching.filter((e) => !pickedIds.has(e.id)))[0];
      if (!ex) break;
      take(ex);
    }
  }

  // Grouped by muscle in priority order, compound-first order from the
  // preferred list kept within each group.
  return groups
    .flatMap((g) => picked.filter((ex) => primaryMuscleGroup(ex) === g))
    .concat(picked.filter((ex) => !groups.includes(primaryMuscleGroup(ex) ?? "")));
}

export function generateDraftExercises(
  pool: Exercise[],
  type: WorkoutTypeOption,
  count: number = DEFAULT_EXERCISE_COUNT,
): WorkoutExercise[] {
  return pickBalancedExercises(pool, type, [], count).map(toWorkoutExercise);
}

export function estimateDurationMinutes(exercises: WorkoutExercise[]): number {
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  return Math.max(5, Math.round((totalSets * MINUTES_PER_SET_ESTIMATE) / 5) * 5);
}
