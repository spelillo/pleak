import { useEffect } from "react";
import { CheckCircle, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export interface WorkoutSummary {
  name: string;
  durationMins: number;
  exercisesFinished: number;
  totalExercises: number;
  setsCompleted: number;
  totalSets: number;
  totalVolume: number;
}

export function WorkoutSummaryModal({
  summary,
  onClose,
  onViewHistory,
}: {
  summary: WorkoutSummary;
  onClose: () => void;
  onViewHistory: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-canvas p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Workout summary"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex size-11 items-center justify-center rounded-full bg-surface-card text-brand-blue">
            <CheckCircle size={24} weight="fill" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-ink">{summary.name} complete</h2>
        <p className="mb-5 text-sm text-muted">Nice work. Here's how it went.</p>

        <dl className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-muted">Duration</dt>
            <dd className="text-lg font-semibold text-ink">{summary.durationMins} min</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Exercises</dt>
            <dd className="text-lg font-semibold text-ink">
              {summary.exercisesFinished}/{summary.totalExercises}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Sets completed</dt>
            <dd className="text-lg font-semibold text-ink">
              {summary.setsCompleted}/{summary.totalSets}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total volume</dt>
            <dd className="text-lg font-semibold text-ink">{summary.totalVolume.toLocaleString()} lb</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <Button variant="primary" className="w-full" onClick={onViewHistory}>
            View history
          </Button>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
