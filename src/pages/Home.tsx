import { useState } from "react";
import { useLocation } from "wouter";
import { Barbell, CalendarBlank } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
import { WorkoutStartModal } from "@/components/workout/WorkoutStartModal";
import { useAuth } from "@/contexts/auth-context";

export function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showStartModal, setShowStartModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Home" description="Your workouts, tracked simply." />

      <Card variant="outline" className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Start a workout</p>
          <p className="text-sm text-muted">Jump straight into logging sets.</p>
        </div>
        <Button variant="primary" onClick={() => setShowStartModal(true)}>
          <Barbell size={16} weight="bold" />
          Start
        </Button>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-ink">This week</h2>
      <EmptyState
        icon={<CalendarBlank size={22} />}
        title="No plan for this week yet"
        description="Build a weekly plan to see your scheduled days here."
        action={
          <Button variant="secondary" size="sm">
            Plan this week
          </Button>
        }
      />

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
