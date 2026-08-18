import { Link } from "wouter";
import { Barbell, CalendarBlank } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function Home() {
  return (
    <div>
      <PageHeader title="Home" description="Your workouts, tracked simply." />

      <Card variant="outline" className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Start a workout</p>
          <p className="text-sm text-muted">Jump straight into logging sets.</p>
        </div>
        <Link href="/workout">
          <Button variant="primary">
            <Barbell size={16} weight="bold" />
            Start
          </Button>
        </Link>
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
    </div>
  );
}
