import { useState } from "react";
import { useLocation } from "wouter";
import { WarningCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ExerciseLibrary } from "@/components/workout/ExerciseLibrary";
import { WorkoutStartFlow } from "@/components/workout/WorkoutStartFlow";
import { ActiveWorkout } from "@/components/workout/ActiveWorkout";
import { WorkoutSummaryModal, type WorkoutSummary } from "@/components/workout/WorkoutSummaryModal";
import { useWorkoutSessions } from "@/lib/queries/workoutSessions";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";

export function Workout() {
  const { user } = useAuth();
  const userId = user!.id;
  const [, setLocation] = useLocation();
  const { data: sessions, isLoading, isError, error } = useWorkoutSessions(userId);
  const activeSession = sessions?.find((s) => s.isActive);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

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
          <ActiveWorkout session={activeSession} userId={userId} onFinished={setSummary} />
        ) : (
          <WorkoutStartFlow userId={userId} username={user!.displayName} />
        ))}

      <ExerciseLibrary />

      {summary && (
        <WorkoutSummaryModal
          summary={summary}
          onClose={() => setSummary(null)}
          onViewHistory={() => {
            setSummary(null);
            setLocation("/history");
          }}
        />
      )}
    </div>
  );
}
