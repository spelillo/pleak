import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import type { Exercise } from "@/lib/types";

// Scoped to the signed-in user, so a cached list never carries one
// account's custom exercises over to another on the same device.
const exercisesKey = (userId: string | undefined) => ["exercises", userId ?? "signed-out"] as const;

type ExerciseFields = Pick<Exercise, "name" | "category" | "exerciseType" | "muscleGroups" | "movementType">;

// Row-level security limits this to system exercises (no userId) plus the
// signed-in user's own custom ones; the client-side filter is a second guard.
export function useExercises() {
  const { user } = useAuth();
  return useQuery({
    queryKey: exercisesKey(user?.id),
    queryFn: () => apiGet<Exercise[]>("exercises", { action: "list" }),
    select: (data) => data.filter((ex) => !ex.userId || ex.userId === user?.id),
    enabled: !!user,
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: ExerciseFields) =>
      apiPost<Exercise>("exercises", "create", { ...input, userId: user?.id ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exercisesKey(user?.id) });
    },
  });
}

/** Edits one of the user's own custom exercises (RLS refuses any other). */
export function useUpdateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<ExerciseFields> & { id: string }) =>
      apiPost<Exercise>("exercises", "update", { id, ...patch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exercisesKey(user?.id) });
    },
  });
}

/**
 * Deletes one of the user's own custom exercises. Past workouts and plans
 * keep their copy of its name, so history isn't affected.
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => apiPost<{ success: true }>("exercises", "delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exercisesKey(user?.id) });
    },
  });
}
