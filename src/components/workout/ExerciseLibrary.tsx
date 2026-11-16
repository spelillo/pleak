import { useMemo, useState } from "react";
import { Barbell, MagnifyingGlass, PencilSimple, Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PillTabs } from "@/components/ui/PillTabs";
import { CreateExerciseModal } from "@/components/workout/CreateExerciseModal";
import { useDeleteExercise, useExercises } from "@/lib/queries/exercises";
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState<Exercise | null>(null);
  const deleteExercise = useDeleteExercise();
  const hasCustom = (exercises ?? []).some((ex) => ex.userId);

  const categoryOptions = useMemo(() => {
    const set = new Set((exercises ?? []).map((ex) => ex.category));
    return [
      { value: "all", label: "All" },
      ...(hasCustom ? [{ value: "custom", label: "My exercises" }] : []),
      ...Array.from(set).sort().map((c) => ({ value: c, label: categoryLabel(c) })),
    ];
  }, [exercises, hasCustom]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matching = (exercises ?? []).filter(
      (ex) =>
        (category === "all" || (category === "custom" ? !!ex.userId : ex.category === category)) &&
        matchesQuery(ex, normalizedQuery),
    );
    // The user's own exercises first, so they're easy to find and manage.
    return [...matching.filter((ex) => ex.userId), ...matching.filter((ex) => !ex.userId)];
  }, [exercises, query, category]);

  // Choice overload: a short list until the user searches or asks for more.
  const BROWSE_LIMIT = 12;
  const visible = query.trim() || showAll ? filtered : filtered.slice(0, BROWSE_LIMIT);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">Exercise library</h2>
        {!isLoading && !isError && exercises && exercises.length > 0 && (
          <span className="text-xs text-muted">{exercises.length} exercises</span>
        )}
      </div>

      <Button className="mb-4 w-full justify-center" onClick={() => setShowCreate(true)}>
        <Plus size={16} weight="bold" />
        Create exercise
      </Button>

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
            <ul className="divide-y divide-hairline overflow-hidden rounded-lg bg-canvas shadow-[var(--shadow-sm)]">
              {visible.map((exercise) => (
                <li key={exercise.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{exercise.name}</p>
                    {exercise.muscleGroups.length > 0 && (
                      <p className="truncate text-xs text-muted">{exercise.muscleGroups.join(", ")}</p>
                    )}
                  </div>
                  {exercise.userId ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone="purple">Custom</Badge>
                      <button
                        type="button"
                        onClick={() => setEditing(exercise)}
                        aria-label={`Edit ${exercise.name}`}
                        className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:text-ink active:bg-surface-strong"
                      >
                        <PencilSimple size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(exercise)}
                        aria-label={`Delete ${exercise.name}`}
                        className="-mr-2 flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:text-error active:bg-surface-strong"
                      >
                        <Trash size={17} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 gap-1.5">
                      {exercise.movementType && <Badge tone="gold">{exercise.movementType}</Badge>}
                      <Badge tone="blue">{categoryLabel(exercise.category)}</Badge>
                    </div>
                  )}
                </li>
              ))}
              {visible.length < filtered.length && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-brand-blue transition-colors active:bg-surface-strong"
                  >
                    Show all {filtered.length} exercises
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {showCreate && (
        <CreateExerciseModal onCreated={() => setShowCreate(false)} onClose={() => setShowCreate(false)} />
      )}

      {editing && (
        <CreateExerciseModal exercise={editing} onCreated={() => setEditing(null)} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <Modal
          onClose={() => {
            deleteExercise.reset();
            setDeleting(null);
          }}
          ariaLabel={`Delete ${deleting.name}`}
          className="max-w-sm p-6"
        >
          <h3 className="mb-2 text-lg font-semibold text-ink">Delete {deleting.name}?</h3>
          <p className="mb-5 text-sm text-muted">
            It's removed from your library. Workouts and plans you've already logged keep it.
          </p>
          {deleteExercise.error && (
            <p className="mb-3 text-xs text-error">Couldn't delete it. Check your connection and try again.</p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-error! active:opacity-80"
              disabled={deleteExercise.isPending}
              onClick={() =>
                deleteExercise.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                })
              }
            >
              {deleteExercise.isPending ? "Deleting…" : "Delete exercise"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                deleteExercise.reset();
                setDeleting(null);
              }}
            >
              Keep it
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
