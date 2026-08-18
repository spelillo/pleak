import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Barbell, CheckCircle, Plus, Trash, WarningCircle, X } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useExercises, useCreateExercise } from "@/lib/queries/exercises";
import {
  useWorkoutSessions,
  useStartWorkoutSession,
  useUpdateWorkoutSession,
} from "@/lib/queries/workoutSessions";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import type { Exercise, WorkoutExercise, WorkoutSession } from "@/lib/types";

function ExerciseLibrary() {
  const { data: exercises, isLoading, isError, error } = useExercises();
  const createExercise = useCreateExercise();
  const [name, setName] = useState("");

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

function StartWorkoutCard({ onStart, isPending }: { onStart: () => void; isPending: boolean }) {
  return (
    <div className="mb-8">
      <EmptyState
        icon={<Barbell size={22} />}
        title="No active workout"
        description="Start a workout to begin logging exercises and sets."
        action={
          <Button variant="primary" onClick={onStart} disabled={isPending}>
            {isPending ? "Starting…" : "Start workout"}
          </Button>
        }
      />
    </div>
  );
}

function SetRow({
  set,
  index,
  exerciseType,
  onChange,
  onRemove,
}: {
  set: WorkoutExercise["sets"][number];
  index: number;
  exerciseType: string;
  onChange: (patch: Partial<WorkoutExercise["sets"][number]>) => void;
  onRemove: () => void;
}) {
  const isCardio = exerciseType === "cardio";

  return (
    <div className="flex items-center gap-2">
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
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Reps"
            value={set.reps ?? ""}
            onChange={(e) => onChange({ reps: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9"
          />
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Weight"
            value={set.weight ?? ""}
            onChange={(e) => onChange({ weight: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9"
          />
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

function ActiveWorkoutPanel({ session, userId }: { session: WorkoutSession; userId: string }) {
  const { data: library } = useExercises();
  const updateSession = useUpdateWorkoutSession(userId);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(session.exercises);
  const [pickedExerciseId, setPickedExerciseId] = useState("");
  const isFirstRender = useRef(true);

  useEffect(() => {
    setExercises(session.exercises);
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
  }, [exercises]);

  function addExercise() {
    const picked = library?.find((ex) => ex.id === pickedExerciseId);
    if (!picked) return;
    if (exercises.some((ex) => ex.exerciseId === picked.id)) {
      setPickedExerciseId("");
      return;
    }
    setExercises((prev) => [
      ...prev,
      { exerciseId: picked.id, name: picked.name, exerciseType: picked.exerciseType, sets: [] },
    ]);
    setPickedExerciseId("");
  }

  function removeExercise(exerciseIndex: number) {
    setExercises((prev) => prev.filter((_, i) => i !== exerciseIndex));
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

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) },
      ),
    );
  }

  function finishWorkout() {
    const endTime = new Date();
    const totalDuration = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);
    updateSession.mutate({
      id: session.id,
      exercises,
      isActive: false,
      endTime: endTime.toISOString(),
      totalDuration,
      durationMins: Math.round(totalDuration / 60),
    });
  }

  const availableExercises = (library ?? []).filter(
    (ex: Exercise) => !exercises.some((added) => added.exerciseId === ex.id),
  );

  return (
    <div className="mb-8">
      <Card variant="outline" className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{session.name}</p>
          <p className="text-sm text-muted">Started {new Date(session.startTime).toLocaleTimeString()}</p>
        </div>
        <Button variant="primary" onClick={finishWorkout}>
          <CheckCircle size={16} weight="bold" />
          Finish workout
        </Button>
      </Card>

      <div className="mb-4 flex gap-2">
        <select
          value={pickedExerciseId}
          onChange={(e) => setPickedExerciseId(e.target.value)}
          className="h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-sm text-ink outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        >
          <option value="">Add an exercise…</option>
          {availableExercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
        <Button onClick={addExercise} disabled={!pickedExerciseId}>
          <Plus size={16} weight="bold" />
          Add
        </Button>
      </div>

      {exercises.length === 0 && (
        <EmptyState
          icon={<Barbell size={22} />}
          title="No exercises logged yet"
          description="Add an exercise above to start logging sets."
        />
      )}

      <div className="flex flex-col gap-4">
        {exercises.map((exercise, exerciseIndex) => (
          <Card key={exercise.exerciseId} variant="outline">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{exercise.name}</p>
              <button
                type="button"
                onClick={() => removeExercise(exerciseIndex)}
                className="flex size-8 items-center justify-center rounded-full text-muted hover:text-error"
                aria-label="Remove exercise"
              >
                <Trash size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {exercise.sets.map((set, setIndex) => (
                <SetRow
                  key={setIndex}
                  set={set}
                  index={setIndex}
                  exerciseType={exercise.exerciseType}
                  onChange={(patch) => updateSet(exerciseIndex, setIndex, patch)}
                  onRemove={() => removeSet(exerciseIndex, setIndex)}
                />
              ))}
            </div>

            <Button variant="text" size="sm" className="mt-2" onClick={() => addSet(exerciseIndex)}>
              <Plus size={14} weight="bold" />
              Add set
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Workout() {
  const { user } = useAuth();
  const userId = user!.id;
  const { data: sessions, isLoading, isError, error } = useWorkoutSessions(userId);
  const startSession = useStartWorkoutSession(userId);
  const activeSession = sessions?.find((s) => s.isActive);

  function handleStart() {
    startSession.mutate({
      username: user!.displayName,
      name: `Workout — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    });
  }

  return (
    <div>
      <PageHeader title="Workout" description="Log sets, reps, and weight as you train." />

      {isError && (
        <Card variant="outline" className="mb-6 flex items-start gap-3 border-error/30">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-error" />
          <div>
            <p className="text-sm font-semibold text-ink">Couldn't load your workout</p>
            <p className="text-sm text-muted">
              {error instanceof ApiError ? error.message : "Something went wrong."}
            </p>
          </div>
        </Card>
      )}

      {isLoading && <p className="mb-8 text-sm text-muted">Loading…</p>}

      {!isLoading &&
        !isError &&
        (activeSession ? (
          <ActiveWorkoutPanel session={activeSession} userId={userId} />
        ) : (
          <StartWorkoutCard onStart={handleStart} isPending={startSession.isPending} />
        ))}

      <ExerciseLibrary />
    </div>
  );
}
