import { useState } from "react";
import { Barbell, Plus, WarningCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useExercises, useCreateExercise } from "@/lib/queries/exercises";
import { ApiError } from "@/lib/api";

function ExerciseLibrary() {
  const { data: exercises, isLoading, isError, error } = useExercises();
  const createExercise = useCreateExercise();
  const [name, setName] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createExercise.mutate(
      {
        name: trimmed,
        category: "weightlifting",
        exerciseType: "weights",
        muscleGroups: [],
      },
      { onSuccess: () => setName("") },
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-ink">Exercise library</h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an exercise, e.g. Barbell Squat"
        />
        <Button type="submit" disabled={createExercise.isPending || !name.trim()}>
          <Plus size={16} weight="bold" />
          Add
        </Button>
      </form>

      {isError && (
        <Card variant="outline" className="mb-4 flex items-start gap-3 border-error/30">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-error" />
          <div>
            <p className="text-sm font-semibold text-ink">Couldn't load exercises</p>
            <p className="text-sm text-muted">
              {error instanceof ApiError ? error.message : "Something went wrong."}
            </p>
          </div>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted">Loading exercises…</p>}

      {!isLoading && !isError && exercises && exercises.length === 0 && (
        <EmptyState
          icon={<Barbell size={22} />}
          title="No exercises yet"
          description="Add your first exercise above to start building your library."
        />
      )}

      {!isLoading && exercises && exercises.length > 0 && (
        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-ink">{exercise.name}</span>
              <Badge tone="blue">{exercise.category}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Workout() {
  return (
    <div>
      <PageHeader title="Workout" description="Log sets, reps, and weight as you train." />

      <div className="mb-8">
        <EmptyState
          icon={<Barbell size={22} />}
          title="No active workout"
          description="Start a workout to begin logging exercises and sets."
          action={<Button variant="primary">Start workout</Button>}
        />
      </div>

      <ExerciseLibrary />
    </div>
  );
}
