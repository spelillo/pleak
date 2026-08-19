import { useEffect, useRef, useState } from "react";
import {
  Barbell,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  CheckCircle,
  Minus,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { useExercises } from "@/lib/queries/exercises";
import { useUpdateWorkoutSession } from "@/lib/queries/workoutSessions";
import { useAuth } from "@/contexts/auth-context";
import { REPS_INCREMENT, WEIGHT_INCREMENT, toWorkoutExercise } from "@/lib/workoutGeneration";
import { cn } from "@/lib/cn";
import type { WorkoutSummary } from "@/components/workout/WorkoutSummaryModal";
import type { Exercise, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/lib/types";

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function firstIncompleteSetIndex(sets: WorkoutSet[]) {
  const index = sets.findIndex((s) => !s.completed);
  return index === -1 ? Math.max(0, sets.length - 1) : index;
}

function firstUnfinishedExerciseIndex(exercises: WorkoutExercise[]) {
  const index = exercises.findIndex((ex) => !ex.finished);
  return index === -1 ? 0 : index;
}

function Stepper({
  value,
  onStep,
  step,
}: {
  value: number;
  onStep: (delta: number) => void;
  step: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onStep(-step)}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors active:scale-[0.98]"
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <span className="flex-1 text-center text-2xl font-semibold text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onStep(step)}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors active:scale-[0.98]"
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function CompletedSetRow({ set, index, isCardio }: { set: WorkoutSet; index: number; isCardio: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-hairline first:border-t-0">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm text-ink">
          <CheckCircle size={16} weight="fill" className="text-brand-blue" />
          Set {index + 1} completed
        </span>
        {isExpanded ? (
          <CaretUp size={16} className="text-muted" />
        ) : (
          <CaretDown size={16} className="text-muted" />
        )}
      </button>
      {isExpanded && (
        <div className="flex flex-col gap-1 px-3.5 pb-3 text-sm">
          {isCardio ? (
            <>
              {set.distance != null && (
                <div className="flex justify-between">
                  <span className="text-muted">Distance:</span>
                  <span className="text-ink">{set.distance} mi</span>
                </div>
              )}
              {set.duration != null && (
                <div className="flex justify-between">
                  <span className="text-muted">Duration:</span>
                  <span className="text-ink">{set.duration} min</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted">Weight:</span>
                <span className="text-ink">{set.weight ?? 0} lbs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Reps:</span>
                <span className="text-ink">{set.reps ?? 0} reps</span>
              </div>
            </>
          )}
        </div>
      )}
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
  const { user } = useAuth();
  const { data: library } = useExercises();
  const updateSession = useUpdateWorkoutSession(userId);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(session.exercises);
  const [currentIndex, setCurrentIndex] = useState(() => firstUnfinishedExerciseIndex(session.exercises));
  const [currentSetIndex, setCurrentSetIndex] = useState(() =>
    firstIncompleteSetIndex(session.exercises[firstUnfinishedExerciseIndex(session.exercises)]?.sets ?? []),
  );
  const [showFinishWorkoutWarning, setShowFinishWorkoutWarning] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const isFirstRender = useRef(true);
  const prevLengthRef = useRef(exercises.length);

  useEffect(() => {
    const initialIndex = firstUnfinishedExerciseIndex(session.exercises);
    setExercises(session.exercises);
    setCurrentIndex(initialIndex);
    setCurrentSetIndex(firstIncompleteSetIndex(session.exercises[initialIndex]?.sets ?? []));
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
    if (exercises.length !== prevLengthRef.current) {
      const clamped = Math.max(0, Math.min(currentIndex, exercises.length - 1));
      setCurrentIndex(clamped);
      setCurrentSetIndex(firstIncompleteSetIndex(exercises[clamped]?.sets ?? []));
      prevLengthRef.current = exercises.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  const elapsedSeconds = Math.max(0, Math.round((now - new Date(session.startTime).getTime()) / 1000));
  const exercisesFinished = exercises.filter((ex) => ex.finished).length;
  const setsCompleted = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const bodyweight = user?.weight;

  function goToExercise(index: number) {
    const clamped = Math.max(0, Math.min(index, exercises.length - 1));
    setCurrentIndex(clamped);
    setCurrentSetIndex(firstIncompleteSetIndex(exercises[clamped]?.sets ?? []));
  }

  function advanceToNextExercise(fromIndex: number) {
    let next = exercises.findIndex((ex, i) => i > fromIndex && !ex.finished);
    if (next === -1) next = exercises.findIndex((ex, i) => i !== fromIndex && !ex.finished);
    if (next === -1) next = fromIndex;
    setCurrentIndex(next);
    setCurrentSetIndex(firstIncompleteSetIndex(exercises[next]?.sets ?? []));
  }

  function updateCurrentSet(patch: Partial<WorkoutSet>) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== currentIndex
          ? ex
          : { ...ex, sets: ex.sets.map((s, si) => (si !== currentSetIndex ? s : { ...s, ...patch })) },
      ),
    );
  }

  function stepCurrentWeight(delta: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== currentIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== currentSetIndex ? s : { ...s, weight: Math.max(0, (s.weight ?? 0) + delta) },
              ),
            },
      ),
    );
  }

  function stepCurrentReps(delta: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== currentIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== currentSetIndex ? s : { ...s, reps: Math.max(0, (s.reps ?? 0) + delta) },
              ),
            },
      ),
    );
  }

  function fillBodyweight() {
    if (!bodyweight) return;
    updateCurrentSet({ weight: bodyweight });
  }

  function addExerciseToWorkout(exercise: Exercise) {
    setExercises((prev) => [...prev, toWorkoutExercise(exercise)]);
    setShowAddExercise(false);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function completeCurrentSet() {
    const current = exercises[currentIndex];
    if (!current) return;
    const set = current.sets[currentSetIndex];
    if (!set) return;
    const updatedSets = current.sets.map((s, i) => (i === currentSetIndex ? { ...s, completed: true } : s));
    const nextIncomplete = updatedSets.findIndex((s) => !s.completed);
    const allDone = nextIncomplete === -1;
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== currentIndex ? ex : { ...ex, sets: updatedSets, finished: allDone ? true : ex.finished },
      ),
    );
    if (allDone) {
      advanceToNextExercise(currentIndex);
    } else {
      setCurrentSetIndex(nextIncomplete);
    }
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
  const currentSet = current?.sets[currentSetIndex];
  const showEditor = !!currentSet && !currentSet.completed;
  const isCardio = current?.exerciseType === "cardio";
  const addedIds = new Set(exercises.map((ex) => ex.exerciseId));
  const availableToAdd = (library ?? []).filter((ex) => !addedIds.has(ex.id));

  return (
    <div className="mb-8">
      <Card variant="outline" className="relative mb-4 text-center">
        <button
          type="button"
          onClick={handleFinishWorkout}
          aria-label="Finish workout"
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-error/10 text-error transition-colors active:scale-[0.98]"
        >
          <X size={18} weight="bold" />
        </button>
        <p className="font-display text-2xl font-semibold text-ink">{formatElapsed(elapsedSeconds)}</p>
        <p className="text-sm text-muted">
          {exercises.length > 0 ? `Exercise ${currentIndex + 1} of ${exercises.length}` : session.name}
        </p>

        {showFinishWorkoutWarning && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-left">
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
          description="Add an exercise to start logging sets."
          action={
            <Button variant="primary" onClick={() => setShowAddExercise(true)}>
              <Plus size={16} weight="bold" />
              Add exercise
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-center gap-2 overflow-x-auto pb-1">
            {exercises.map((ex, i) => (
              <button
                key={ex.exerciseId}
                type="button"
                onClick={() => goToExercise(i)}
                aria-label={`Jump to ${ex.name}`}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  i === currentIndex
                    ? "bg-brand-blue text-white"
                    : ex.finished
                      ? "bg-surface-card text-muted"
                      : "border border-hairline text-ink",
                )}
              >
                {ex.finished ? <CheckCircle size={16} weight="fill" /> : i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAddExercise(true)}
              aria-label="Add exercise"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-hairline text-muted transition-colors hover:text-ink"
            >
              <Plus size={16} />
            </button>
          </div>
          <p className="mb-4 text-center text-xs text-muted">Tap any exercise to jump to it</p>

          {current && (
            <Card variant="outline" className="mb-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-ink">{current.name}</p>
                <button
                  type="button"
                  onClick={() => removeExercise(currentIndex)}
                  aria-label={`Remove ${current.name}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-error"
                >
                  <Trash size={16} />
                </button>
              </div>
              <p className="mb-4 text-xs text-muted">{current.finished ? "Finished" : "Current exercise"}</p>

              {showEditor && currentSet && (
                <div className="rounded-lg bg-surface-soft p-4">
                  <p className="mb-3 text-sm font-semibold text-ink">Set {currentSetIndex + 1}</p>

                  {isCardio ? (
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted">Distance</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={currentSet.distance ?? ""}
                          onChange={(e) =>
                            updateCurrentSet({ distance: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted">Duration (min)</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={currentSet.duration ?? ""}
                          onChange={(e) =>
                            updateCurrentSet({ duration: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1.5 text-xs text-muted">Weight (lbs)</p>
                        <Stepper value={currentSet.weight ?? 0} onStep={stepCurrentWeight} step={WEIGHT_INCREMENT} />
                        {bodyweight != null && (
                          <button
                            type="button"
                            onClick={fillBodyweight}
                            className="mt-2 text-xs font-medium text-brand-blue hover:underline"
                          >
                            BW ({bodyweight} lbs)
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs text-muted">Reps</p>
                        <Stepper value={currentSet.reps ?? 0} onStep={stepCurrentReps} step={REPS_INCREMENT} />
                      </div>
                    </div>
                  )}

                  <Button variant="primary" className="mt-4 w-full" onClick={completeCurrentSet}>
                    <CheckCircle size={16} weight="bold" />
                    Complete Set
                  </Button>
                </div>
              )}

              {current.sets.some((s) => s.completed) && (
                <div className={cn("rounded-lg border border-hairline", showEditor && "mt-3")}>
                  {current.sets.map(
                    (set, i) =>
                      set.completed && <CompletedSetRow key={i} set={set} index={i} isCardio={isCardio} />,
                  )}
                </div>
              )}

              {!currentSet && (
                <EmptyState icon={<Barbell size={20} />} title="No sets yet" description="This exercise has no sets." />
              )}
            </Card>
          )}

          <div className="mb-4 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => goToExercise(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <CaretLeft size={16} weight="bold" />
              Previous
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => goToExercise(currentIndex + 1)}
              disabled={currentIndex === exercises.length - 1}
            >
              Next Exercise
              <CaretRight size={16} weight="bold" />
            </Button>
          </div>
        </>
      )}

      {showAddExercise && (
        <Modal onClose={() => setShowAddExercise(false)} ariaLabel="Add exercise" className="max-w-sm p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Add exercise</h3>
            <button
              type="button"
              onClick={() => setShowAddExercise(false)}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
          <ExercisePicker exercises={availableToAdd} onSelect={addExerciseToWorkout} />
        </Modal>
      )}
    </div>
  );
}
