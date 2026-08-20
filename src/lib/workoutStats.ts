import type { WorkoutSession } from "@/lib/types";
import { addDays } from "@/lib/weekPlanning";

// Sum of weight × reps across every completed set in a session — the
// standard "volume" measure for strength training. Cardio sets (no
// weight/reps) contribute 0.
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0), 0),
    0,
  );
}

function sessionMinutes(session: WorkoutSession): number {
  if (session.durationMins != null) return session.durationMins;
  if (session.totalDuration != null) return session.totalDuration / 60;
  return 0;
}

// Only finished workouts count toward these stats — an abandoned or
// still-running session shouldn't skew them.
function isCompleted(session: WorkoutSession): boolean {
  return session.isActive === false;
}

function startedInRange(session: WorkoutSession, start: Date, end: Date): boolean {
  const t = new Date(session.startTime).getTime();
  return t >= start.getTime() && t < end.getTime();
}

// Minutes spent working out, bucketed by day of week (index 0 = Sunday),
// for completed sessions starting within [weekStart, weekStart + 7 days).
export function minutesByDayThisWeek(sessions: WorkoutSession[], weekStart: Date): number[] {
  const weekEnd = addDays(weekStart, 7);
  const buckets = new Array(7).fill(0) as number[];
  for (const session of sessions) {
    if (!isCompleted(session) || !startedInRange(session, weekStart, weekEnd)) continue;
    buckets[new Date(session.startTime).getDay()] += sessionMinutes(session);
  }
  return buckets;
}

// Total volume (lbs) across completed sessions, optionally restricted to
// sessions starting within a date range.
export function totalVolume(sessions: WorkoutSession[], range?: { start: Date; end: Date }): number {
  return sessions.reduce((sum, session) => {
    if (!isCompleted(session)) return sum;
    if (range && !startedInRange(session, range.start, range.end)) return sum;
    return sum + sessionVolume(session);
  }, 0);
}

export function formatDuration(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
