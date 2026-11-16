import { useState } from "react";
import { useLocation } from "wouter";
import { Barbell } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { WorkoutStartModal } from "@/components/workout/WorkoutStartModal";
import { WeeklyPlanner } from "@/components/home/WeeklyPlanner";
import { useAuth } from "@/contexts/auth-context";
import { useWorkoutSessions } from "@/lib/queries/workoutSessions";

export function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showStartModal, setShowStartModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: sessions } = useWorkoutSessions(user?.id);
  const hasActiveSession = sessions?.some((s) => s.isActive) ?? false;

  return (
    <div>
      <PageHeader title="Home" description="Your workouts, tracked simply." />

      <Card variant="outline" className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">
            {hasActiveSession ? "Workout in progress" : "Start a workout"}
          </p>
          <p className="text-sm text-muted">
            {hasActiveSession ? "You've already got one going." : "Jump straight into logging sets."}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => (hasActiveSession ? setLocation("/workout") : setShowStartModal(true))}
        >
          <Barbell size={16} weight="bold" />
          {hasActiveSession ? "Resume" : "Start"}
        </Button>
      </Card>

      <WeeklyPlanner onError={setToastMessage} />

      {showStartModal && (
        <WorkoutStartModal
          userId={user!.id}
          username={user!.displayName}
          onClose={() => setShowStartModal(false)}
          onStarted={() => {
            setShowStartModal(false);
            setLocation("/workout");
          }}
          onError={setToastMessage}
        />
      )}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
