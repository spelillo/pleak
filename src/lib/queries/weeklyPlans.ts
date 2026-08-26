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

// Optimistic: the day card updates the instant "Save to plan" is pressed
// instead of waiting on the Apps Script round trip. No onSuccess
// reconciliation or onError rollback here, deliberately — see the same
// tradeoff on useUpdateWorkoutSession in workoutSessions.ts. A day can be
// saved again quickly (e.g. edit, then immediately start the workout, which
// also saves), and reconciling from a slower, stale response would clobber
// the newer optimistic write.
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
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: daysKey(weeklyPlanId, weekStartDate) });
      const optimisticId = input.id ?? `optimistic-${crypto.randomUUID()}`;
      const optimisticDay: WeeklyPlanDay = {
        id: optimisticId,
        weeklyPlanId,
        weekStartDate,
        dayOfWeek: input.dayOfWeek,
        title: input.title,
        isRestDay: false,
        exercises: input.exercises,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<WeeklyPlanDay[]>(daysKey(weeklyPlanId, weekStartDate), (old) => [
        ...(old ?? []).filter((d) => d.id !== optimisticId),
        optimisticDay,
      ]);
    },
  });
}

// Optimistic: the day disappears from the grid immediately on delete.
export function useDeleteWeeklyPlanDay(weeklyPlanId: string, weekStartDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<{ success: boolean }>("weeklyPlanDays", "delete", { id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: daysKey(weeklyPlanId, weekStartDate) });
      const previous = queryClient.getQueryData<WeeklyPlanDay[]>(daysKey(weeklyPlanId, weekStartDate));
      queryClient.setQueryData<WeeklyPlanDay[]>(daysKey(weeklyPlanId, weekStartDate), (old) =>
        (old ?? []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(daysKey(weeklyPlanId, weekStartDate), context.previous);
    },
  });
}
