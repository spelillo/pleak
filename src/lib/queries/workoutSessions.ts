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

export function useStartWorkoutSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; name: string; exercises: WorkoutExercise[] }) =>
      apiPost<WorkoutSession>("workoutSessions", "create", {
        userId,
        username: input.username,
        name: input.name,
        startTime: new Date().toISOString(),
        exercises: input.exercises,
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKey(userId) });
    },
  });
}

export function useUpdateWorkoutSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WorkoutSession> & { id: string }) =>
      apiPost<WorkoutSession>("workoutSessions", "update", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKey(userId) });
    },
  });
}

export function useDeleteWorkoutSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<{ success: boolean }>("workoutSessions", "delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKey(userId) });
    },
  });
}
