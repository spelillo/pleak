import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { Exercise } from "@/lib/types";

const exercisesKey = ["exercises"] as const;

export function useExercises() {
  return useQuery({
    queryKey: exercisesKey,
    queryFn: () => apiGet<Exercise[]>("exercises", { action: "list" }),
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<Exercise, "name" | "category" | "exerciseType" | "muscleGroups">) =>
      apiPost<Exercise>("exercises", "create", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exercisesKey });
    },
  });
}
