import { useEffect, useRef, useState } from "react";
import { Barbell, CheckCircle, Minus, Plus, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { useExercises } from "@/lib/queries/exercises";
import { useUpdateWorkoutSession } from "@/lib/queries/workoutSessions";
import { WEIGHT_INCREMENT, toWorkoutExercise } from "@/lib/workoutGeneration";
import { cn } from "@/lib/cn";
import type { WorkoutSummary } from "@/components/workout/WorkoutSummaryModal";
import type { Exercise, WorkoutExercise, WorkoutSession } from "@/lib/types";

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function firstUnfinishedIndex(exercises: WorkoutExercise[]) {
  const index = exercises.findIndex((ex) => !ex.finished);
  return index === -1 ? 0 : index;
}

function SetRow({
  set,
  index,
  exerciseType,
  onChange,
  onStepWeight,
  onRemove,
}: {
  set: WorkoutExercise["sets"][number];
  index: number;
  exerciseType: string;
  onChange: (patch: Partial<WorkoutExercise["sets"][number]>) => void;
  onStepWeight: (delta: number) => void;
  onRemove: () => void;
}) {
  const isCardio = exerciseType === "cardio";

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-xs font-medium text-muted">{index + 1}</span>
      {isCardio ? (
        <>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Distance"
            value={set.distance ?? ""}
            onChange={(e) => onChange({ distance: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9"
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Duration (min)"
            value={set.duration ?? ""}
            onChange={(e) => onChange({ duration: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9"
          />
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Reps"
              value={set.reps ?? ""}
              onChange={(e) => onChange({ reps: e.target.value ? Number(e.target.value) : undefined })}
              className="h-9"
            />
          </div>
          <button
            type="button"
            onClick={() => onStepWeight(-WEIGHT_INCREMENT)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors active:scale-[0.98]"
            aria-label="Decrease weight"
          >
            <Minus size={14} />
          </button>
          <div className="w-16 shrink-0">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Weight"
              value={set.weight ?? ""}
              onChange={(e) => onChange({ weight: e.target.value ? Number(e.target.value) : undefined })}
              className="h-9 px-2 text-center"
            />
          </div>
          <button
            type="button"
            onClick={() => onStepWeight(WEIGHT_INCREMENT)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors active:scale-[0.98]"
            aria-label="Increase weight"
          >
            <Plus size={14} />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onChange({ completed: !set.completed })}
        className={
          set.completed
            ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
            : "flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline text-muted"
        }
        aria-pressed={set.completed}
        aria-label="Mark set complete"
      >
        <CheckCircle size={18} weight={set.completed ? "fill" : "regular"} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-error"
        aria-label="Remove set"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ActiveWorkout({
  session,
  userId,
  onFinished,
}: {
  session: WorkoutSession;
  userId: string;
  onFinished: (summary: WorkoutSummary) => void;
}) {
  const { data: library } = useExercises();
  const updateSession = useUpdateWorkoutSession(userId);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(session.exercises);
  const [currentIndex, setCurrentIndex] = useState(() => firstUnfinishedIndex(session.exercises));
  const [showFinishExerciseWarning, setShowFinishExerciseWarning] = useState(false);
  const [showFinishWorkoutWarning, setShowFinishWorkoutWarning] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const isFirstRender = useRef(true);

  useEffect(() => {
    setExercises(session.exercises);
    setCurrentIndex(firstUnfinishedIndex(session.exercises));
  }, [session.id]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      updateSession.mutate({ id: session.id, exercises });
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setShowFinishExerciseWarning(false);
  }, [currentIndex]);

  const elapsedSeconds = Math.max(0, Math.round((now - new Date(session.startTime).getTime()) / 1000));
  const exercisesFinished = exercises.filter((ex) => ex.finished).length;
  const setsCompleted = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  function updateExercise(index: number, patch: Partial<WorkoutExercise>) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  function addExercise(exercise: Exercise) {
    setExercises((prev) => [...prev, toWorkoutExercise(exercise)]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, exercises.length - 2)));
  }

  function addSet(exerciseIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : { ...ex, sets: [...ex.sets, { setNumber: ex.sets.length + 1, completed: false }] },
      ),
    );
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    patch: Partial<WorkoutExercise["sets"][number]>,
  ) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : { ...ex, sets: ex.sets.map((set, si) => (si !== setIndex ? set : { ...set, ...patch })) },
      ),
    );
  }

  function stepWeight(exerciseIndex: number, setIndex: number, delta: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((set, si) =>
                si !== setIndex ? set : { ...set, weight: Math.max(0, (set.weight ?? 0) + delta) },
              ),
            },
      ),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) },
      ),
    );
  }

  function advanceAfterFinish(justFinishedIndex: number) {
    let next = exercises.findIndex((ex, i) => i > justFinishedIndex && !ex.finished);
    if (next === -1) next = exercises.findIndex((ex, i) => i !== justFinishedIndex && !ex.finished);
    setCurrentIndex(next === -1 ? justFinishedIndex : next);
  }

  function handleFinishExercise() {
    const current = exercises[currentIndex];
    if (!current) return;
    const allComplete = current.sets.every((s) => s.completed);
    if (!allComplete && !showFinishExerciseWarning) {
      setShowFinishExerciseWarning(true);
      return;
    }
    updateExercise(currentIndex, { finished: true });
    setShowFinishExerciseWarning(false);
    advanceAfterFinish(currentIndex);
  }

  function doFinishWorkout() {
    const endTime = new Date();
    const totalDurationSec = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);
    const durationMins = Math.max(1, Math.round(totalDurationSec / 60));
    const totalVolume = exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets.reduce((s, set) => s + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0),
      0,
    );
    updateSession.mutate(
      {
        id: session.id,
        exercises,
        isActive: false,
        endTime: endTime.toISOString(),
        totalDuration: totalDurationSec,
        durationMins,
      },
      {
        onSuccess: () => {
          onFinished({
            name: session.name,
            durationMins,
            exercisesFinished,
            totalExercises: exercises.length,
            setsCompleted,
            totalSets,
            totalVolume,
          });
        },
      },
    );
  }

  function handleFinishWorkout() {
    if (exercisesFinished < exercises.length && !showFinishWorkoutWarning) {
      setShowFinishWorkoutWarning(true);
      return;
    }
    setShowFinishWorkoutWarning(false);
    doFinishWorkout();
  }

  const current = exercises[currentIndex];
  const currentLibraryExercise = library?.find((ex) => ex.id === current?.exerciseId);
  const addedIds = new Set(exercises.map((ex) => ex.exerciseId));
  const availableToAdd = (library ?? []).filter((ex) => !addedIds.has(ex.id));

  return (
    <div className="mb-8">
      <Card variant="outline" className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{session.name}</p>
            <p className="text-sm text-muted">
              {formatElapsed(elapsedSeconds)} · {exercisesFinished}/{exercises.length} exercises ·{" "}
              {setsCompleted}/{totalSets} sets
            </p>
          </div>
          <Button variant="primary" onClick={handleFinishWorkout}>
            <CheckCircle size={16} weight="bold" />
            Finish workout
          </Button>
        </div>
        {showFinishWorkoutWarning && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
            <p className="text-xs text-ink">
              {exercises.length - exercisesFinished} exercise{exercises.length - exercisesFinished === 1 ? "" : "s"}{" "}
              unfinished. Finish anyway?
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowFinishWorkoutWarning(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleFinishWorkout}>
                Finish
              </Button>
            </div>
          </div>
        )}
      </Card>

      {exercises.length === 0 ? (
        <EmptyState
          icon={<Barbell size={22} />}
          title="No exercises logged yet"
          description="Add an exercise below to start logging sets."
        />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {exercises.map((ex, i) => (
              <button
                key={ex.exerciseId}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-medium transition-colors",
                  i === currentIndex
                    ? "bg-brand-blue text-white"
                    : ex.finished
                      ? "bg-surface-card text-muted"
                      : "bg-surface-soft text-ink",
                )}
              >
                {ex.finished && <CheckCircle size={12} weight="fill" />}
                {ex.name}
              </button>
            ))}
          </div>

          {current && (
            <Card variant="outline" className="mb-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{current.name}</p>
                  {currentLibraryExercise?.instructions && (
                    <p className="mt-0.5 text-xs text-muted">{currentLibraryExercise.instructions}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeExercise(currentIndex)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-error"
                  aria-label={`Remove ${current.name}`}
                >
                  <Trash size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {current.sets.map((set, setIndex) => (
                  <SetRow
                    key={setIndex}
                    set={set}
                    index={setIndex}
                    exerciseType={current.exerciseType}
                    onChange={(patch) => updateSet(currentIndex, setIndex, patch)}
                    onStepWeight={(delta) => stepWeight(currentIndex, setIndex, delta)}
                    onRemove={() => removeSet(currentIndex, setIndex)}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Button variant="text" size="sm" onClick={() => addSet(currentIndex)}>
                  <Plus size={14} weight="bold" />
                  Add set
                </Button>
                <Button
                  variant={current.finished ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleFinishExercise}
                >
                  <CheckCircle size={14} weight="bold" />
                  {current.finished ? "Finished" : "Finish exercise"}
                </Button>
              </div>

              {showFinishExerciseWarning && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
                  <p className="text-xs text-ink">Some sets are incomplete. Finish anyway?</p>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setShowFinishExerciseWarning(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleFinishExercise}>
                      Finish
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <ExercisePicker exercises={availableToAdd} onAdd={addExercise} placeholder="Add an exercise…" />
    </div>
  );
}
