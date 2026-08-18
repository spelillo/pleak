import { Target } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function Goals() {
  return (
    <div>
      <PageHeader
        title="Goals"
        description="Track targets and personal records."
        action={
          <Button variant="secondary" size="sm">
            New goal
          </Button>
        }
      />
      <EmptyState
        icon={<Target size={22} />}
        title="No goals yet"
        description="Set a goal, like a target weight or a lift you're chasing, to track progress toward it."
        action={<Button variant="primary">Add a goal</Button>}
      />
    </div>
  );
}
