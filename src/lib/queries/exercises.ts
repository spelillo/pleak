import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import type { Exercise } from "@/lib/types";

const exercisesKey = ["exercises"] as const;

// Row-level security already limits this to system exercises (no userId)
// plus the signed-in user's own; the client-side filter is kept as a
// belt-and-braces guard.
export function useExercises() {
  const { user } = useAuth();
  return useQuery({
    queryKey: exercisesKey,
    queryFn: () => apiGet<Exercise[]>("exercises", { action: "list" }),
    select: (data) => data.filter((ex) => !ex.userId || ex.userId === user?.id),
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (
      input: Pick<Exercise, "name" | "category" | "exerciseType" | "muscleGroups" | "movementType">,
    ) => apiPost<Exercise>("exercises", "create", { ...input, userId: user?.id ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exercisesKey });
    },
  });
}
