import { useState } from "react";
import { useLocation } from "wouter";
import { CalendarBlank, CaretLeft, CaretRight, CheckCircle, CircleNotch, Plus } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { springDefault } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/auth-context";
import { useCreateWeeklyWorkoutPlan, useWeeklyPlanDays, useWeeklyWorkoutPlans } from "@/lib/queries/weeklyPlans";
import { addDays, DAY_LABELS, FULL_DAY_LABELS, formatWeekRange, isSameDay, startOfWeek, toDateKey } from "@/lib/weekPlanning";
import { WeeklyPlanDayModal } from "@/components/home/WeeklyPlanDayModal";
import type { WeeklyPlanDay } from "@/lib/types";

export function WeeklyPlanner({ onError }: { onError: (message: string) => void }) {
  const { user } = useAuth();
  const userId = user!.id;
  const [, setLocation] = useLocation();
  const reduceMotion = useReducedMotion();

  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const weekStartKey = toDateKey(weekStart);
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today));

  const { data: plans, isPending: isPlansPending } = useWeeklyWorkoutPlans(userId);
  const activePlan = plans?.find((p) => p.isActive);
  const createPlan = useCreateWeeklyWorkoutPlan(userId);

  const { data: days, isPending: isDaysPending } = useWeeklyPlanDays(activePlan?.id, weekStartKey);
  // Days can't even start fetching until the plans query resolves and hands
  // over activePlan.id (see the `enabled` gate in useWeeklyPlanDays), so
  // isDaysPending alone would read true forever when there's no plan yet.
  // Only treat "days" as still loading while a plan is actually in flight.
  const isLoading = isPlansPending || (!!activePlan && isDaysPending);
  const daysByIndex = new Map((days ?? []).map((d) => [d.dayOfWeek, d]));

  const [activeDay, setActiveDay] = useState<{ dayOfWeek: number; date: Date; existing: WeeklyPlanDay | null } | null>(
    null,
  );
  // The only remaining unavoidable wait: the very first day ever planned has
  // to create the WeeklyWorkoutPlan record before the modal can open, since
  // every day references it. Everything after that is instant.
  const [bootstrappingDay, setBootstrappingDay] = useState<number | null>(null);

  async function handleDayClick(dayOfWeek: number, date: Date) {
    const existing = daysByIndex.get(dayOfWeek) ?? null;
    let planId = activePlan?.id;
    if (!planId) {
      setBootstrappingDay(dayOfWeek);
      try {
        const plan = await createPlan.mutateAsync("My Plan");
        planId = plan.id;
      } catch {
        onError("Couldn't set up your weekly plan — check your connection and try again.");
        return;
      } finally {
        setBootstrappingDay(null);
      }
    }
    setActiveDay({ dayOfWeek, date, existing });
  }

  const plannedCount = days?.length ?? 0;
  const todayEntry = daysByIndex.get(today.getDay());

  return (
    <Card variant="outline" className="mb-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <CalendarBlank size={18} className="text-brand-blue" />
            <h2 className="text-lg font-semibold text-ink">Weekly Plan</h2>
          </div>
          <Badge tone="blue">{plannedCount}/7 days</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            aria-label="Previous week"
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <CaretLeft size={16} />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm text-muted">{formatWeekRange(weekStart)}</span>
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            aria-label="Next week"
            className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DAY_LABELS.map((label, i) => {
          const date = addDays(weekStart, i);
          const planned = daysByIndex.get(i);
          const isToday = isSameDay(date, today);
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => handleDayClick(i, date)}
              aria-label={`${planned ? "Edit" : "Plan"} ${FULL_DAY_LABELS[i]}`}
              disabled={isLoading}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              transition={springDefault}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border px-1 py-3 transition-colors disabled:opacity-60",
                isToday ? "border-brand-blue bg-brand-blue/5" : "border-hairline",
              )}
            >
              <span className={cn("text-xs", isToday ? "font-medium text-brand-blue" : "text-muted")}>{label}</span>
              <span className="text-base font-semibold text-ink">{date.getDate()}</span>
              {bootstrappingDay === i ? (
                <CircleNotch size={18} className="animate-spin text-muted" />
              ) : isLoading ? (
                <CircleNotch size={18} className="animate-spin text-muted/50" />
              ) : planned ? (
                <CheckCircle size={18} weight="fill" className="text-brand-blue" />
              ) : (
                <Plus size={18} className="text-muted" />
              )}
            </motion.button>
          );
        })}
      </div>

      {isCurrentWeek && (
        <div className="mt-4 rounded-lg bg-surface-soft p-4">
          <p className="text-sm font-semibold text-ink">Today: {FULL_DAY_LABELS[today.getDay()]}</p>
          <p className="text-sm text-muted">
            {isLoading ? "Loading…" : todayEntry ? todayEntry.title || "Workout planned" : "No workout planned"}
          </p>
        </div>
      )}

      {activeDay && activePlan && (
        <WeeklyPlanDayModal
          userId={userId}
          username={user!.displayName}
          weeklyPlanId={activePlan.id}
          weekStartDate={weekStartKey}
          dayOfWeek={activeDay.dayOfWeek}
          dayLabel={`${FULL_DAY_LABELS[activeDay.dayOfWeek]}, ${activeDay.date.getMonth() + 1}/${activeDay.date.getDate()}`}
          existing={activeDay.existing}
          onClose={() => setActiveDay(null)}
          onError={onError}
          onStartWorkout={() => {
            setActiveDay(null);
            setLocation("/workout");
          }}
        />
      )}
    </Card>
  );
}
