import { useState } from "react";
import { useLocation } from "wouter";
import { Barbell, WarningCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExerciseLibrary } from "@/components/workout/ExerciseLibrary";
import { WorkoutStartModal } from "@/components/workout/WorkoutStartModal";
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
  const [showStartModal, setShowStartModal] = useState(false);

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
          <div className="mb-8">
            <EmptyState
              icon={<Barbell size={22} />}
              title="No active workout"
              description="Start a workout to begin logging exercises and sets."
              action={
                <Button variant="primary" onClick={() => setShowStartModal(true)}>
                  Start workout
                </Button>
              }
            />
          </div>
        ))}

      <ExerciseLibrary />

      {showStartModal && (
        <WorkoutStartModal
          userId={userId}
          username={user!.displayName}
          onClose={() => setShowStartModal(false)}
          onStarted={() => setShowStartModal(false)}
        />
      )}

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
