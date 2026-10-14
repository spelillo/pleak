import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { WeeklyPlanDay, WeeklyWorkoutPlan } from "@/lib/types";

function plansKey(userId: string) {
  return ["weeklyWorkoutPlans", userId] as const;
}

function daysKey(weeklyPlanId: string, weekStartDate: string) {
  return ["weeklyPlanDays", weeklyPlanId, weekStartDate] as const;
}

// Saves and deletes for a plan's days run in order (see sessionsScope in
// workoutSessions.ts for why).
function daysScope(weeklyPlanId: string) {
  return { id: `weeklyPlanDays:${weeklyPlanId}` };
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
    // Put the new plan in the cache right away so the day modal waiting on
    // it can open without another round trip.
    onSuccess: (plan) => {
      queryClient.setQueryData<WeeklyWorkoutPlan[]>(plansKey(userId), (old) => [...(old ?? []), plan]);
    },
  });
}

export function useWeeklyPlanDays(weeklyPlanId: string | undefined, weekStartDate: string) {
  return useQuery({
    queryKey: daysKey(weeklyPlanId ?? "", weekStartDate),
    queryFn: () => apiGet<WeeklyPlanDay[]>("weeklyPlanDays", { action: "list", weeklyPlanId, weekStartDate }),
    enabled: !!weeklyPlanId,
    // Same race as useWorkoutSessions (see its comment): saves here are
    // optimistic with no reconciliation, so a background refetch racing an
    // in-flight save can clobber it with pre-write data.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Optimistic: the day card updates the instant "Save to plan" is pressed
// instead of waiting on the database round trip. A new day gets its id
// here and every save is an upsert, so saving the same day again before
// the first save lands updates that row rather than failing. No onSuccess
// reconciliation or onError rollback here, deliberately — see the same
// tradeoff on useUpdateWorkoutSession in workoutSessions.ts. A day can be
// saved again quickly (e.g. edit, then immediately start the workout, which
// also saves), and reconciling from a slower, stale response would clobber
// the newer optimistic write.
export function useSaveWeeklyPlanDay(weeklyPlanId: string, weekStartDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: daysScope(weeklyPlanId),
    mutationFn: (day: WeeklyPlanDay) => apiPost<WeeklyPlanDay>("weeklyPlanDays", "upsert", { ...day }),
    onMutate: async (day) => {
      await queryClient.cancelQueries({ queryKey: daysKey(weeklyPlanId, weekStartDate) });
      queryClient.setQueryData<WeeklyPlanDay[]>(daysKey(weeklyPlanId, weekStartDate), (old) => [
        ...(old ?? []).filter((d) => d.id !== day.id && d.dayOfWeek !== day.dayOfWeek),
        day,
      ]);
    },
  });
}

// Optimistic: the day disappears from the grid immediately on delete.
export function useDeleteWeeklyPlanDay(weeklyPlanId: string, weekStartDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: daysScope(weeklyPlanId),
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
