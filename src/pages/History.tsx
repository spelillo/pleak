import { ClockCounterClockwise } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function History() {
  return (
    <div>
      <PageHeader title="History" description="Every workout you've logged, in one place." />
      <EmptyState
        icon={<ClockCounterClockwise size={22} />}
        title="No workouts logged yet"
        description="Finished workouts will show up here with your sets and progress."
        action={<Button variant="secondary">Log your first workout</Button>}
      />
    </div>
  );
}
