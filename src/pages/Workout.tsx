import { Barbell } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function Workout() {
  return (
    <div>
      <PageHeader title="Workout" description="Log sets, reps, and weight as you train." />
      <EmptyState
        icon={<Barbell size={22} />}
        title="No active workout"
        description="Start a workout to begin logging exercises and sets."
        action={<Button variant="primary">Start workout</Button>}
      />
    </div>
  );
}
