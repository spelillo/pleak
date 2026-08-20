import { CheckCircle, Trophy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { WorkoutExercise } from "@/lib/types";

export interface WorkoutSummary {
  name: string;
  durationMins: number;
  exercises: WorkoutExercise[];
}

function ExerciseSummaryRow({ exercise }: { exercise: WorkoutExercise }) {
  const completedSets = exercise.sets.filter((s) => s.completed);
  const isCardio = exercise.exerciseType === "cardio";

  return (
    <div className="border-t border-hairline py-3 first:border-t-0 first:pt-0">
      <p className="mb-1.5 text-sm font-semibold text-ink">{exercise.name}</p>
      {completedSets.length === 0 ? (
        <p className="text-xs text-muted">No sets completed</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {completedSets.map((set, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-muted">
              <span className="w-9 shrink-0 text-ink/70">Set {i + 1}</span>
              {isCardio ? (
                <span>
                  {set.distance ?? 0} mi · {set.duration ?? 0} min
                </span>
              ) : (
                <span>
                  {set.weight ?? 0} lbs × {set.reps ?? 0} reps
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WorkoutSummaryModal({ summary, onClose }: { summary: WorkoutSummary; onClose: () => void }) {
  return (
    <Modal onClose={onClose} ariaLabel="Workout summary" className="p-6">
      <div>
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <Trophy size={28} weight="fill" />
          </div>
          <h2 className="text-lg font-semibold text-ink">{summary.name} complete</h2>
          <p className="text-sm text-muted">
            {summary.durationMins} min · {summary.exercises.length} exercise
            {summary.exercises.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mb-6 max-h-[45vh] overflow-y-auto rounded-lg border border-hairline px-3.5">
          {summary.exercises.map((exercise, i) => (
            <ExerciseSummaryRow key={i} exercise={exercise} />
          ))}
        </div>

        <Button variant="primary" className="w-full" onClick={onClose}>
          <CheckCircle size={16} weight="bold" />
          Nice
        </Button>
      </div>
    </Modal>
  );
}
