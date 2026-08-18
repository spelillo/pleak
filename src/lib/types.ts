// Data shapes for the Pleak Apps Script API. Mirrors the sheet tabs defined
// in apps-script/Code.gs. Field set is trimmed from the original LifeBud
// schema per the Phase 1 scope decisions (no billing, social, GPS, AI, or
// password fields) — see docs/design-guidelines.md and the project plan.

export interface User {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  dateOfBirth?: string;
  sex?: "M" | "F";
  height?: number;
  weight?: number;
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
