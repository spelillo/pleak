import type { WorkoutSession } from "@/lib/types";

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  achievedAt: string;
}

// A PR is the heaviest completed set logged for an exercise across every
// session (cardio has no weight, so it's excluded).
export function computePersonalRecords(sessions: WorkoutSession[]): ExercisePR[] {
  const bestByExercise = new Map<string, ExercisePR>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseType === "cardio") continue;
      for (const set of exercise.sets) {
        if (!set.completed || set.weight == null) continue;
        const existing = bestByExercise.get(exercise.exerciseId);
        if (!existing || set.weight > existing.weight) {
          bestByExercise.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.name,
            weight: set.weight,
            achievedAt: session.startTime,
          });
        }
      }
    }
  }

  return [...bestByExercise.values()].sort((a, b) => b.weight - a.weight);
}

export function getExercisePR(exerciseId: string, sessions: WorkoutSession[]): number | null {
  let max: number | null = null;
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets) {
        if (!set.completed || set.weight == null) continue;
        if (max == null || set.weight > max) max = set.weight;
      }
    }
  }
  return max;
}
