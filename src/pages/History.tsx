import { useState } from "react";
import { CaretDown, CaretUp, ClockCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkoutSessions } from "@/lib/queries/workoutSessions";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import type { WorkoutSession } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function SessionCard({ session, isOpen, onToggle }: { session: WorkoutSession; isOpen: boolean; onToggle: () => void }) {
  const setsCompleted = session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <Card variant="outline">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <p className="text-sm font-semibold text-ink">{session.name}</p>
          <p className="text-sm text-muted">
            {formatDate(session.startTime)}
            {session.durationMins != null && ` · ${session.durationMins} min`} · {session.exercises.length}{" "}
            exercises · {setsCompleted}/{totalSets} sets
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted">
          {isOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
        </span>
      </button>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4">
          {session.exercises.map((exercise) => (
            <div key={exercise.exerciseId}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{exercise.name}</p>
                {exercise.finished && <Badge tone="blue">Finished</Badge>}
              </div>
              <ul className="flex flex-col gap-1">
                {exercise.sets.map((set, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-4 shrink-0">{i + 1}</span>
                    {exercise.exerciseType === "cardio" ? (
                      <span>
                        {set.distance != null && `${set.distance} mi`}
                        {set.distance != null && set.duration != null && " · "}
                        {set.duration != null && `${set.duration} min`}
                      </span>
                    ) : (
                      <span>
                        {set.reps != null ? `${set.reps} reps` : "—"}
                        {set.weight != null && ` · ${set.weight} lb`}
                      </span>
                    )}
                    <span className={set.completed ? "text-brand-blue" : ""}>
                      {set.completed ? "Complete" : "Incomplete"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function History() {
  const { user } = useAuth();
  const userId = user!.id;
  const { data: sessions, isLoading, isError, error } = useWorkoutSessions(userId);
  const [openId, setOpenId] = useState<string | null>(null);

  const completed = (sessions ?? [])
    .filter((s) => !s.isActive)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div>
      <PageHeader title="History" description="Every workout you've logged, in one place." />

      {isError && (
        <Card variant="outline" className="mb-6 flex items-start gap-3 border-error/30">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-error" />
          <div>
            <p className="text-sm font-semibold text-ink">Couldn't load your history</p>
            <p className="text-sm text-muted">
              {error instanceof ApiError ? error.message : "Something went wrong."}
            </p>
          </div>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted">Loading…</p>}

      {!isLoading && !isError && completed.length === 0 && (
        <EmptyState
          icon={<ClockCounterClockwise size={22} />}
          title="No workouts logged yet"
          description="Finished workouts will show up here with your sets and progress."
        />
      )}

      {!isLoading && !isError && completed.length > 0 && (
        <div className="flex flex-col gap-3">
          {completed.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isOpen={openId === session.id}
              onToggle={() => setOpenId((prev) => (prev === session.id ? null : session.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
