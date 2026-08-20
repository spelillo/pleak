import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { WeeklyPlanDay, WeeklyWorkoutPlan, WorkoutExercise } from "@/lib/types";

function plansKey(userId: string) {
  return ["weeklyWorkoutPlans", userId] as const;
}

function daysKey(weeklyPlanId: string, weekStartDate: string) {
  return ["weeklyPlanDays", weeklyPlanId, weekStartDate] as const;
}

export function useWeeklyWorkoutPlans(userId: string | undefined) {
  return useQuery({
    queryKey: plansKey(userId ?? ""),
    queryFn: () => apiGet<WeeklyWorkoutPlan[]>("weeklyWorkoutPlans", { action: "list", userId }),
    enabled: !!userId,
  });
}

export function useCreateWeeklyWorkoutPlan(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiPost<WeeklyWorkoutPlan>("weeklyWorkoutPlans", "create", { userId, name, isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKey(userId) });
    },
  });
}

export function useWeeklyPlanDays(weeklyPlanId: string | undefined, weekStartDate: string) {
  return useQuery({
    queryKey: daysKey(weeklyPlanId ?? "", weekStartDate),
    queryFn: () => apiGet<WeeklyPlanDay[]>("weeklyPlanDays", { action: "list", weeklyPlanId, weekStartDate }),
    enabled: !!weeklyPlanId,
  });
}

export function useSaveWeeklyPlanDay(weeklyPlanId: string, weekStartDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; dayOfWeek: number; title: string; exercises: WorkoutExercise[] }) =>
      input.id
        ? apiPost<WeeklyPlanDay>("weeklyPlanDays", "update", {
            id: input.id,
            title: input.title,
            exercises: input.exercises,
          })
        : apiPost<WeeklyPlanDay>("weeklyPlanDays", "create", {
            weeklyPlanId,
            weekStartDate,
            dayOfWeek: input.dayOfWeek,
            title: input.title,
            isRestDay: false,
            exercises: input.exercises,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: daysKey(weeklyPlanId, weekStartDate) });
    },
  });
}

export function useDeleteWeeklyPlanDay(weeklyPlanId: string, weekStartDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<{ success: boolean }>("weeklyPlanDays", "delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: daysKey(weeklyPlanId, weekStartDate) });
    },
  });
}
