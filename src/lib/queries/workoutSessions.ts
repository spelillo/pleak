import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { WorkoutExercise, WorkoutSession } from "@/lib/types";

function sessionsKey(userId: string) {
  return ["workoutSessions", userId] as const;
}

export function useWorkoutSessions(userId: string | undefined) {
  return useQuery({
    queryKey: sessionsKey(userId ?? ""),
    queryFn: () => apiGet<WorkoutSession[]>("workoutSessions", { action: "list", userId }),
    enabled: !!userId,
  });
}

// Optimistic: the session appears in the list (and ActiveWorkout renders)
// the instant the user hits "Start workout", rather than waiting on the
// Apps Script round trip. onSuccess swaps the placeholder for the real
// record; onError rolls the list back so the UI matches what's actually saved.
export function useStartWorkoutSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; name: string; exercises: WorkoutExercise[]; startTime: string }) =>
      apiPost<WorkoutSession>("workoutSessions", "create", {
        userId,
        username: input.username,
        name: input.name,
        startTime: input.startTime,
        exercises: input.exercises,
        isActive: true,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: sessionsKey(userId) });
      const previous = queryClient.getQueryData<WorkoutSession[]>(sessionsKey(userId));
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticSession: WorkoutSession = {
        id: optimisticId,
        userId,
        username: input.username,
        name: input.name,
        startTime: input.startTime,
        exercises: input.exercises,
        isActive: true,
      };
      queryClient.setQueryData<WorkoutSession[]>(sessionsKey(userId), (old) => [...(old ?? []), optimisticSession]);
      return { previous, optimisticId };
    },
    onSuccess: (session, _input, context) => {
      queryClient.setQueryData<WorkoutSession[]>(sessionsKey(userId), (old) =>
        (old ?? []).map((s) => (s.id === context?.optimisticId ? session : s)),
      );
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(sessionsKey(userId), context.previous);
    },
  });
}

// Optimistic: patches are applied to the cached session immediately so
// callers (set logging autosave, finish workout) never have to wait on the
// backend before the UI reflects the change.
//
// This mutation fires repeatedly and out of order (a debounced autosave from
// a set logged a moment ago can still be in flight when "Finish workout"
// fires the isActive:false update). Deliberately skip both the onSuccess
// cache reconciliation and the onError rollback here — either one lets a
// slower, stale request clobber a newer optimistic write once it resolves.
// The local optimistic state is treated as authoritative; a failed save
// only surfaces a toast via the caller's onError, it doesn't unwind the UI.
export function useUpdateWorkoutSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WorkoutSession> & { id: string }) =>
      apiPost<WorkoutSession>("workoutSessions", "update", input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: sessionsKey(userId) });
      queryClient.setQueryData<WorkoutSession[]>(sessionsKey(userId), (old) =>
        (old ?? []).map((s) => (s.id === input.id ? { ...s, ...input } : s)),
      );
    },
  });
}

// Optimistic: the session is removed from the list immediately on cancel.
export function useDeleteWorkoutSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<{ success: boolean }>("workoutSessions", "delete", { id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: sessionsKey(userId) });
      const previous = queryClient.getQueryData<WorkoutSession[]>(sessionsKey(userId));
      queryClient.setQueryData<WorkoutSession[]>(sessionsKey(userId), (old) => (old ?? []).filter((s) => s.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(sessionsKey(userId), context.previous);
    },
  });
}
