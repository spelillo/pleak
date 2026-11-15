import type { AiPlanConfig } from "./planBuilder";

// Data shapes for Pleak's data. Mirrors the Supabase tables in
// supabase/migrations (snake_case there; src/lib/api.ts converts). Field
// set is trimmed from the original LifeBud schema per the Phase 1 scope
// decisions (no billing, social, GPS, AI, or password fields) — see
// docs/design-guidelines.md and the project plan.

export interface User {
  id: string;
  googleId?: string | null; // set for accounts that first signed in with Google
  email: string;
  displayName: string;
  dateOfBirth?: string;
  sex?: "M" | "F";
  height?: number;
  weight?: number; // body weight, always stored in pounds
  weightUnit?: "lb" | "kg"; // how weights are shown and typed; defaults to lb
  age?: number;
  streak?: number;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string; // weightlifting, cardio, functional, stretch-recovery
  exerciseType: "weights" | "cardio" | "stretch";
  muscleGroups: string[];
  movementType?: "Push" | "Pull" | "Legs"; // weightlifting exercises only
  instructions?: string;
  equipment?: string;
  userId?: string | null; // null/absent = system exercise
  createdAt: string;
}

export interface WorkoutSet {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  restTime?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  exerciseType: string;
  sets: WorkoutSet[];
  finished?: boolean; // set when the user taps "Finish exercise", regardless of whether every set is complete
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  category: string;
  exercises: { exerciseId: string; sets: number; reps: number; weight?: number }[];
  estimatedDuration?: number;
  difficulty?: string;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  username: string;
  planId?: string;
  name: string;
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  durationMins?: number;
  exercises: WorkoutExercise[];
  isActive: boolean;
}

export interface ScheduledWorkout {
  id: string;
  userId: string;
  name: string;
  category: string;
  scheduledDate: string;
  scheduledDay: string;
  exercises: WorkoutExercise[];
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: string; // weight_loss, weight_gain, strength
  category: string;
  targetValue?: number;
  currentValue?: number;
  startingValue?: number;
  unit?: string;
  deadline?: string;
  status: "active" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high";
  exerciseId?: string;
  targetExerciseWeight?: number;
  targetTime?: number;
  targetDistance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseName: string;
  exerciseType: string;
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  achievedAt: string;
  workoutSessionId?: string;
  createdAt: string;
}

export interface WeeklyWorkoutPlan {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  // Set when the plan was made with "Help build my plan"; drives the
  // weekly refresh (see src/lib/planBuilder.ts).
  aiConfig?: AiPlanConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlanDay {
  id: string;
  weeklyPlanId: string;
  weekStartDate: string;
  dayOfWeek: number; // 0=Sunday
  title?: string;
  isRestDay: boolean;
  exercises: WorkoutExercise[];
  createdAt: string;
}

export interface WeeklyPlanCompletion {
  id: string;
  weeklyPlanId: string;
  userId: string;
  weekStartDate: string;
  dayOfWeek: number;
  sessionId?: string;
  completedAt?: string;
  createdAt: string;
}

export type ResourceName =
  | "users"
  | "exercises"
  | "workoutPlans"
  | "workoutSessions"
  | "scheduledWorkouts"
  | "goals"
  | "personalRecords"
  | "weeklyWorkoutPlans"
  | "weeklyPlanDays"
  | "weeklyPlanCompletions";
