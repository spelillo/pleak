import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Barbell, MagnifyingGlass, Plus, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PillTabs } from "@/components/ui/PillTabs";
import { useExercises, useCreateExercise } from "@/lib/queries/exercises";
import { ApiError } from "@/lib/api";
import { categoryLabel } from "@/lib/exerciseLabels";
import type { Exercise } from "@/lib/types";

function matchesQuery(exercise: Exercise, query: string) {
  if (!query) return true;
  const haystack = `${exercise.name} ${exercise.muscleGroups.join(" ")}`.toLowerCase();
  return haystack.includes(query);
}

export function ExerciseLibrary() {
  const { data: exercises, isLoading, isError, error } = useExercises();
  const createExercise = useCreateExercise();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  function handleAdd(e: FormEvent) {
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

  const categoryOptions = useMemo(() => {
    const set = new Set((exercises ?? []).map((ex) => ex.category));
    return [{ value: "all", label: "All" }, ...Array.from(set).sort().map((c) => ({ value: c, label: categoryLabel(c) }))];
  }, [exercises]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (exercises ?? []).filter(
      (ex) => (category === "all" || ex.category === category) && matchesQuery(ex, normalizedQuery),
    );
  }, [exercises, query, category]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Exercise library</h2>
        {!isLoading && !isError && exercises && exercises.length > 0 && (
          <span className="text-xs text-muted">{exercises.length} exercises</span>
        )}
      </div>

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

      {!isLoading && !isError && exercises && exercises.length > 0 && (
        <>
          <div className="relative mb-3">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises or muscle groups"
              className="pl-9"
            />
          </div>

          <PillTabs options={categoryOptions} value={category} onChange={setCategory} className="mb-4" />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<MagnifyingGlass size={22} />}
              title="No matching exercises"
              description="Try a different search term or category."
            />
          ) : (
            <ul className="divide-y divide-hairline rounded-lg border border-hairline">
              {filtered.map((exercise) => (
                <li key={exercise.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{exercise.name}</p>
                    {exercise.muscleGroups.length > 0 && (
                      <p className="truncate text-xs text-muted">{exercise.muscleGroups.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {exercise.movementType && <Badge tone="gold">{exercise.movementType}</Badge>}
                    <Badge tone="blue">{categoryLabel(exercise.category)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
