import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowsClockwise, Barbell, Plus, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { springDefault } from "@/lib/motion";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { useExercises } from "@/lib/queries/exercises";
import { useSaveWeeklyPlanDay, useDeleteWeeklyPlanDay } from "@/lib/queries/weeklyPlans";
import { useStartWorkoutSession, useWorkoutSessions } from "@/lib/queries/workoutSessions";
import { generateDraftExercises, toWorkoutExercise, WORKOUT_TYPES, type WorkoutTypeOption } from "@/lib/workoutGeneration";
import type { WeeklyPlanDay, WorkoutExercise } from "@/lib/types";

type Step = "type" | "choice" | "curate";

export function WeeklyPlanDayModal({
  userId,
  username,
  weeklyPlanId,
  weekStartDate,
  dayOfWeek,
  dayLabel,
  existing,
  onClose,
  onError,
  onStartWorkout,
}: {
  userId: string;
  username: string;
  weeklyPlanId: string;
  weekStartDate: string;
  dayOfWeek: number;
  dayLabel: string;
  existing: WeeklyPlanDay | null;
  onClose: () => void;
  onError: (message: string) => void;
  onStartWorkout: () => void;
}) {
  const { data: library } = useExercises();
  const saveDay = useSaveWeeklyPlanDay(weeklyPlanId, weekStartDate);
  const deleteDay = useDeleteWeeklyPlanDay(weeklyPlanId, weekStartDate);
  const startSession = useStartWorkoutSession(userId);
  const { data: sessions } = useWorkoutSessions(userId);
  const hasActiveSession = sessions?.some((s) => s.isActive) ?? false;
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>(existing ? "curate" : "type");
  const [selectedType, setSelectedType] = useState<WorkoutTypeOption | null>(null);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [draft, setDraft] = useState<WorkoutExercise[]>(existing?.exercises ?? []);
  const [showPicker, setShowPicker] = useState(false);

  const draftIds = new Set(draft.map((ex) => ex.exerciseId));
  const availableToAdd = (library ?? []).filter((ex) => !draftIds.has(ex.id));

  function handleSelectType(type: WorkoutTypeOption) {
    setSelectedType(type);
    setTitle(`${type.label} Day`);
    setStep("choice");
  }

  function handleSaveTypeOnly() {
    saveDay.mutate(
      { id: existing?.id, dayOfWeek, title: title || `${selectedType?.label} Day`, exercises: [] },
      { onError: () => onError("Couldn't save your plan — check your connection.") },
    );
    onClose();
  }

  function handleGenerateAndCurate() {
    if (!selectedType || !library) return;
    setDraft(generateDraftExercises(library, selectedType));
    setStep("curate");
  }

  function handleShuffle() {
    if (selectedType && library) setDraft(generateDraftExercises(library, selectedType));
  }

  function handleRemoveExercise(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    saveDay.mutate(
      { id: existing?.id, dayOfWeek, title: title || "Workout", exercises: draft },
      { onError: () => onError("Couldn't save your plan — check your connection.") },
    );
    onClose();
  }

  function handleDelete() {
    if (!existing) return;
    deleteDay.mutate(existing.id, {
      onError: () => onError("Couldn't remove this plan — check your connection."),
    });
    onClose();
  }

  async function handleStartNow() {
    if (draft.length === 0) return;
    if (hasActiveSession) {
      onError("You already have a workout in progress — finish or discard it before starting another.");
      return;
    }
    // Persist whatever's been curated so the plan reflects what's actually
    // being done, not just whatever was last explicitly "saved". Awaited so
    // a failed save doesn't leave a workout session started from exercises
    // that never made it into the plan.
    try {
      await saveDay.mutateAsync({ id: existing?.id, dayOfWeek, title: title || "Workout", exercises: draft });
    } catch {
      onError("Couldn't save your plan — check your connection.");
      return;
    }
    startSession.mutate(
      { username, name: title || "Workout", exercises: draft, startTime: new Date().toISOString() },
      { onError: () => onError("Couldn't start the workout — check your connection and try again.") },
    );
    onStartWorkout();
  }

  return (
    <Modal onClose={onClose} ariaLabel={`Plan ${dayLabel}`} className="max-w-lg">
      <div className="flex items-center justify-between border-b border-hairline p-4">
        <div className="flex items-center gap-2">
          {step !== "type" && !existing && (
            <button
              type="button"
              onClick={() => setStep(step === "curate" ? "choice" : "type")}
              aria-label="Back"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <p className="text-base font-semibold text-ink">{dayLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto p-5">
        {step === "type" && (
          <div className="flex flex-col gap-3">
            <p className="mb-1 text-sm text-muted">What kind of workout?</p>
            {WORKOUT_TYPES.map((type) => (
              <motion.button
                key={type.id}
                type="button"
                onClick={() => handleSelectType(type)}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={springDefault}
                className="rounded-lg border border-hairline bg-surface-soft px-4 py-4 text-left transition-colors hover:bg-surface-card"
              >
                <p className="text-base font-semibold text-ink">{type.label}</p>
                <p className="text-sm text-muted">{type.description}</p>
              </motion.button>
            ))}
          </div>
        )}

        {step === "choice" && selectedType && (
          <div className="flex flex-col gap-3">
            <p className="mb-1 text-sm text-muted">{selectedType.label} Day — how do you want to plan it?</p>
            <motion.button
              type="button"
              onClick={handleSaveTypeOnly}
              disabled={saveDay.isPending}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={springDefault}
              className="rounded-lg border border-hairline bg-surface-soft px-4 py-4 text-left transition-colors hover:bg-surface-card disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-ink">Just save the type</p>
              <p className="text-xs text-muted">Pick exercises later, right before you work out.</p>
            </motion.button>
            <motion.button
              type="button"
              onClick={handleGenerateAndCurate}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={springDefault}
              className="rounded-lg border border-hairline bg-surface-soft px-4 py-4 text-left transition-colors hover:bg-surface-card"
            >
              <p className="text-sm font-semibold text-ink">Generate exercises now</p>
              <p className="text-xs text-muted">Curate a full exercise list you can edit later.</p>
            </motion.button>
          </div>
        )}

        {step === "curate" && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Workout name"
                className="flex-1"
              />
              {selectedType && (
                <button
                  type="button"
                  onClick={handleShuffle}
                  aria-label="Shuffle exercises"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
                >
                  <ArrowsClockwise size={18} />
                </button>
              )}
            </div>

            {draft.length === 0 ? (
              <EmptyState icon={<Barbell size={20} />} title="No exercises yet" description="Add exercises below." />
            ) : (
              <div className="flex flex-col gap-3">
                {draft.map((exercise, index) => (
                  <Card key={exercise.exerciseId} variant="outline" className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">
                      {index + 1}. {exercise.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(index)}
                      aria-label={`Remove ${exercise.name}`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-error"
                    >
                      <Trash size={16} />
                    </button>
                  </Card>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hairline px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-brand-blue hover:text-ink"
            >
              <Plus size={16} weight="bold" />
              Add exercise
            </button>

            {showPicker && (
              <div className="mt-3">
                <ExercisePicker
                  exercises={availableToAdd}
                  onSelect={(ex) => {
                    setDraft((prev) => [...prev, toWorkoutExercise(ex)]);
                    setShowPicker(false);
                  }}
                  placeholder="Search exercises to add…"
                  autoFocus
                />
              </div>
            )}
          </>
        )}
      </div>

      {step === "curate" && (
        <div className="flex flex-col gap-2 border-t border-hairline p-4">
          <Button variant="primary" className="w-full" onClick={handleSave} disabled={saveDay.isPending}>
            Save to plan
          </Button>
          {draft.length > 0 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleStartNow}
              disabled={hasActiveSession || startSession.isPending}
            >
              {hasActiveSession ? "Workout already in progress" : "Start workout now"}
            </Button>
          )}
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteDay.isPending}
              className="h-10 w-full text-sm font-medium text-muted transition-colors hover:text-error disabled:opacity-50"
            >
              Remove from plan
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
