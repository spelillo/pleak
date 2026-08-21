import { useState } from "react";
import { ArrowLeft, ArrowsClockwise, Barbell, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ExercisePickerModal } from "@/components/workout/ExercisePickerModal";
import { estimateDurationMinutes, toWorkoutExercise, type WorkoutTypeOption } from "@/lib/workoutGeneration";
import type { Exercise, WorkoutExercise } from "@/lib/types";

function DraftExerciseCard({
  index,
  exercise,
  libraryExercise,
  onSwapClick,
  onRemove,
}: {
  index: number;
  exercise: WorkoutExercise;
  libraryExercise?: Exercise;
  onSwapClick: () => void;
  onRemove: () => void;
}) {
  return (
    <Card variant="outline">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {index + 1}. {exercise.name}
          </p>
          {libraryExercise && libraryExercise.muscleGroups.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">{libraryExercise.muscleGroups.join(", ")}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onSwapClick}
            aria-label={`Swap ${exercise.name}`}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <PencilSimple size={16} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${exercise.name}`}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-error"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

export function WorkoutDraftModal({
  type,
  draft,
  library,
  onBack,
  onClose,
  onBackToHome,
  onShuffle,
  onUpdateExercise,
  onRemoveExercise,
  onAddExercise,
  onStart,
}: {
  type: WorkoutTypeOption;
  draft: WorkoutExercise[];
  library: Exercise[];
  onBack: () => void;
  onClose: () => void;
  onBackToHome: () => void;
  onShuffle: () => void;
  onUpdateExercise: (index: number, next: WorkoutExercise) => void;
  onRemoveExercise: (index: number) => void;
  onAddExercise: (exercise: Exercise) => void;
  onStart: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const estimatedMinutes = estimateDurationMinutes(draft);
  const draftIds = new Set(draft.map((ex) => ex.exerciseId));
  const availableToAdd = library.filter((ex) => !draftIds.has(ex.id));

  return (
    <>
    <Modal onClose={onClose} ariaLabel={`${type.label} workout preview`} className="max-w-lg">
      <div className="flex items-center justify-between border-b border-hairline p-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to workout types"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{type.label} Day</p>
            <p className="text-xs text-muted">
              {draft.length} exercises · {estimatedMinutes} min
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onShuffle}
            aria-label="Shuffle exercises"
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <ArrowsClockwise size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto p-4">
        <Card className="mb-4">
          <p className="mb-1 text-sm font-semibold text-ink">Workout overview</p>
          <p className="mb-4 text-sm text-muted">{type.description} focused workout</p>
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-semibold text-brand-blue">{draft.length}</p>
              <p className="text-xs text-muted">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#8a6d00] dark:text-brand-gold">{estimatedMinutes}min</p>
              <p className="text-xs text-muted">Duration</p>
            </div>
          </div>
        </Card>

        <p className="mb-2 text-sm font-semibold text-ink">Exercises</p>

        {draft.length === 0 ? (
          <EmptyState
            icon={<Barbell size={22} />}
            title="No matching exercises"
            description="No weightlifting exercises match this type yet. Add exercises below."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {draft.map((exercise, index) => (
              <DraftExerciseCard
                key={exercise.exerciseId}
                index={index}
                exercise={exercise}
                libraryExercise={library.find((ex) => ex.id === exercise.exerciseId)}
                onSwapClick={() => setSwapIndex(index)}
                onRemove={() => onRemoveExercise(index)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hairline px-4 py-4 text-sm font-medium text-muted transition-colors hover:border-brand-blue hover:text-ink"
        >
          <Plus size={16} weight="bold" />
          Add exercise
        </button>

      </div>

      <div className="border-t border-hairline p-4">
        <Button variant="primary" className="mb-2 w-full" onClick={onStart} disabled={draft.length === 0}>
          Start workout
        </Button>
        <Button variant="text" className="w-full justify-center" onClick={onBackToHome}>
          Back to home
        </Button>
      </div>
    </Modal>

    {showPicker && (
      <ExercisePickerModal
        exercises={availableToAdd}
        title="Add exercise"
        onSelect={(ex) => {
          onAddExercise(ex);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
      />
    )}

    {swapIndex !== null && (
      <ExercisePickerModal
        exercises={availableToAdd}
        title={`Swap ${draft[swapIndex]?.name ?? "exercise"}`}
        onSelect={(next) => {
          onUpdateExercise(swapIndex, toWorkoutExercise(next));
          setSwapIndex(null);
        }}
        onClose={() => setSwapIndex(null)}
      />
    )}
    </>
  );
}
