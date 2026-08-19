import { useState } from "react";
import { ArrowLeft, Barbell, Shuffle, Trash, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PillTabs } from "@/components/ui/PillTabs";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { useExercises } from "@/lib/queries/exercises";
import { useStartWorkoutSession } from "@/lib/queries/workoutSessions";
import { ApiError } from "@/lib/api";
import {
  DEFAULT_REPS,
  MOVEMENT_TYPES,
  PRIMARY_TARGETS,
  buildDefaultSets,
  generateDraftExercises,
  selectionLabel,
  toWorkoutExercise,
  type MovementType,
  type PrimaryTarget,
  type WorkoutSelection,
} from "@/lib/workoutGeneration";
import type { Exercise, WorkoutExercise } from "@/lib/types";

const TARGET_OPTIONS = PRIMARY_TARGETS.map((t) => ({ value: t, label: t }));
const MOVEMENT_OPTIONS = MOVEMENT_TYPES.map((m) => ({ value: m, label: m }));

function DraftExerciseCard({
  exercise,
  onChange,
  onRemove,
}: {
  exercise: WorkoutExercise;
  onChange: (next: WorkoutExercise) => void;
  onRemove: () => void;
}) {
  const isCardio = exercise.exerciseType === "cardio";
  const setsCount = exercise.sets.length;
  const reps = exercise.sets[0]?.reps ?? DEFAULT_REPS;
  const weight = exercise.sets[0]?.weight;

  function regenerate(patch: { setsCount?: number; reps?: number; weight?: number }) {
    onChange({
      ...exercise,
      sets: buildDefaultSets(
        exercise.exerciseType,
        patch.setsCount ?? setsCount,
        patch.reps ?? reps,
        "weight" in patch ? patch.weight : weight,
      ),
    });
  }

  return (
    <Card variant="outline">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">{exercise.name}</p>
        <button
          type="button"
          onClick={onRemove}
          className="flex size-8 items-center justify-center rounded-full text-muted hover:text-error"
          aria-label={`Remove ${exercise.name}`}
        >
          <Trash size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Sets</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={setsCount}
            onChange={(e) => regenerate({ setsCount: Math.max(1, Number(e.target.value) || 1) })}
            className="h-9"
          />
        </label>
        {!isCardio && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Reps</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={reps}
                onChange={(e) => regenerate({ reps: Math.max(1, Number(e.target.value) || 1) })}
                className="h-9"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Starting weight</span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Optional"
                value={weight ?? ""}
                onChange={(e) => regenerate({ weight: e.target.value ? Number(e.target.value) : undefined })}
                className="h-9"
              />
            </label>
          </>
        )}
      </div>
    </Card>
  );
}

export function WorkoutStartFlow({ userId, username }: { userId: string; username: string }) {
  const { data: library, isLoading, isError, error } = useExercises();
  const startSession = useStartWorkoutSession(userId);
  const [selection, setSelection] = useState<WorkoutSelection | null>(null);
  const [draft, setDraft] = useState<WorkoutExercise[] | null>(null);

  function generate(nextSelection: WorkoutSelection) {
    setDraft(generateDraftExercises(library ?? [], nextSelection));
  }

  function handleSelectTarget(value: string) {
    setSelection({ kind: "target", value: value as PrimaryTarget });
  }

  function handleSelectMovement(value: string) {
    setSelection({ kind: "movement", value: value as MovementType });
  }

  function updateDraftExercise(index: number, next: WorkoutExercise) {
    setDraft((prev) => prev?.map((ex, i) => (i === index ? next : ex)) ?? prev);
  }

  function removeDraftExercise(index: number) {
    setDraft((prev) => prev?.filter((_, i) => i !== index) ?? prev);
  }

  function addDraftExercise(exercise: Exercise) {
    setDraft((prev) => (prev ? [...prev, toWorkoutExercise(exercise)] : prev));
  }

  function startWorkout() {
    if (!draft || draft.length === 0 || !selection) return;
    startSession.mutate({
      username,
      name: `${selectionLabel(selection)} — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      exercises: draft,
    });
  }

  if (isError) {
    return (
      <Card variant="outline" className="mb-8 flex items-start gap-3 border-error/30">
        <WarningCircle size={20} className="mt-0.5 shrink-0 text-error" />
        <div>
          <p className="text-sm font-semibold text-ink">Couldn't load exercises</p>
          <p className="text-sm text-muted">
            {error instanceof ApiError ? error.message : "Something went wrong."}
          </p>
        </div>
      </Card>
    );
  }

  if (draft && selection) {
    const draftExerciseIds = new Set(draft.map((ex) => ex.exerciseId));
    const availableToAdd = (library ?? []).filter((ex) => !draftExerciseIds.has(ex.id));

    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
              aria-label="Back to selection"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-sm font-semibold text-ink">{selectionLabel(selection)} workout</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => generate(selection)}>
            <Shuffle size={14} weight="bold" />
            Shuffle
          </Button>
        </div>

        {draft.length === 0 ? (
          <EmptyState
            icon={<Barbell size={22} />}
            title="No matching exercises"
            description="No weightlifting exercises match that selection yet. Add exercises below or try a different one."
          />
        ) : (
          <div className="mb-4 flex flex-col gap-4">
            {draft.map((exercise, index) => (
              <DraftExerciseCard
                key={exercise.exerciseId}
                exercise={exercise}
                onChange={(next) => updateDraftExercise(index, next)}
                onRemove={() => removeDraftExercise(index)}
              />
            ))}
          </div>
        )}

        <div className="mb-4">
          <ExercisePicker
            exercises={availableToAdd}
            onAdd={addDraftExercise}
            placeholder="Add another exercise…"
          />
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={startWorkout}
          disabled={draft.length === 0 || startSession.isPending}
        >
          {startSession.isPending ? "Starting…" : "Start workout"}
        </Button>
      </div>
    );
  }

  return (
    <Card variant="outline" className="mb-8">
      <h2 className="mb-1 text-sm font-semibold text-ink">Start a workout</h2>
      <p className="mb-4 text-sm text-muted">
        Choose a primary target or a movement type. The app will build a randomized workout for you.
      </p>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Primary target</p>
        <PillTabs
          options={TARGET_OPTIONS}
          value={selection?.kind === "target" ? selection.value : null}
          onChange={handleSelectTarget}
        />
      </div>

      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Movement type</p>
        <PillTabs
          options={MOVEMENT_OPTIONS}
          value={selection?.kind === "movement" ? selection.value : null}
          onChange={handleSelectMovement}
        />
      </div>

      <Button
        variant="primary"
        className="w-full"
        disabled={!selection || isLoading}
        onClick={() => selection && generate(selection)}
      >
        {isLoading ? "Loading exercises…" : "Generate workout"}
      </Button>
    </Card>
  );
}
