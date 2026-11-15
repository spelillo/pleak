import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarBlank, CaretLeft, CaretRight, CheckCircle, CircleNotch, Plus, Sparkle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { springDefault } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/auth-context";
import { useCreateWeeklyWorkoutPlan, useWeeklyPlanDays, useWeeklyWorkoutPlans } from "@/lib/queries/weeklyPlans";
import { addDays, DAY_LABELS, FULL_DAY_LABELS, formatWeekRange, isSameDay, startOfWeek, toDateKey } from "@/lib/weekPlanning";
import { WeeklyPlanDayModal } from "@/components/home/WeeklyPlanDayModal";
import { PlanAssistantModal } from "@/components/home/PlanAssistantModal";
import { useExercises } from "@/lib/queries/exercises";
import { generateWeek, savePlanConfig, saveWeek, splitDisplayName } from "@/lib/queries/planAssistant";
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

  const [showAssistant, setShowAssistant] = useState(false);
  const queryClient = useQueryClient();
  const { data: library } = useExercises();
  const aiConfig = activePlan?.aiConfig ?? null;
  const currentWeekKey = toDateKey(startOfWeek(today));

  // Weekly refresh for plans made with the assistant: the first time an
  // empty week from now on is opened, fill it with the next turn of the
  // split rotation and fresh exercises. Each week is filled at most once
  // (generatedWeeks), so a week the user clears on purpose stays clear.
  const [fillingWeek, setFillingWeek] = useState<string | null>(null);
  const fillStarted = useRef(new Set<string>());
  const needsFill =
    !!aiConfig &&
    !!activePlan &&
    !!library &&
    !isDaysPending &&
    (days?.length ?? 0) === 0 &&
    weekStartKey >= currentWeekKey &&
    weekStartKey >= aiConfig.anchorWeek &&
    !aiConfig.generatedWeeks.includes(weekStartKey);

  useEffect(() => {
    if (!needsFill || !aiConfig || !activePlan || !library) return;
    const weekKey = weekStartKey;
    if (fillStarted.current.has(weekKey)) return;
    fillStarted.current.add(weekKey);
    setFillingWeek(weekKey);
    (async () => {
      try {
        const week = await generateWeek({ config: aiConfig, weekKey, library, weeklyPlanId: activePlan.id });
        await saveWeek(queryClient, activePlan.id, weekKey, week.days);
        await savePlanConfig(queryClient, userId, activePlan, {
          ...aiConfig,
          generatedWeeks: [...aiConfig.generatedWeeks, weekKey].slice(-60),
        });
      } catch {
        fillStarted.current.delete(weekKey);
        onError("Couldn't fill in this week's plan. Check your connection.");
      } finally {
        setFillingWeek((w) => (w === weekKey ? null : w));
      }
    })();
  }, [needsFill, aiConfig, activePlan, library, weekStartKey, queryClient, userId, onError]);

  const isFilling = fillingWeek === weekStartKey;
  const plannedCount = days?.length ?? 0;
  const todayEntry = daysByIndex.get(today.getDay());

  return (
    <Card variant="outline" className="mb-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <CalendarBlank size={18} className="text-brand-blue" />
            <h2 className="section-title whitespace-nowrap">Weekly plan</h2>
          </div>
          <Badge tone="blue">{plannedCount}/7 days</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            aria-label="Previous week"
            className="flex size-8 items-center justify-center rounded-full text-brand-blue transition-colors hover:bg-surface-card active:bg-surface-strong"
          >
            <CaretLeft size={16} />
          </button>
          <span className="tabular min-w-[4.5rem] text-center text-sm text-muted">{formatWeekRange(weekStart)}</span>
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            aria-label="Next week"
            className="flex size-8 items-center justify-center rounded-full text-brand-blue transition-colors hover:bg-surface-card active:bg-surface-strong"
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
              disabled={isLoading || isFilling}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              transition={springDefault}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md px-1 py-2.5 transition-colors disabled:opacity-60",
                isToday ? "bg-brand-blue/12" : "bg-surface-soft",
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

      {isFilling && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <CircleNotch size={14} className="animate-spin" />
          Building this week with fresh exercises
        </p>
      )}

      {isCurrentWeek && (
        <div className="mt-4 rounded-md bg-surface-soft px-4 py-3">
          <p className="text-sm font-semibold text-ink">Today: {FULL_DAY_LABELS[today.getDay()]}</p>
          <p className="text-sm text-muted">
            {isLoading ? "Loading…" : todayEntry ? todayEntry.title || "Workout planned" : "No workout planned"}
          </p>
        </div>
      )}

      <motion.button
        type="button"
        onClick={() => setShowAssistant(true)}
        disabled={isPlansPending}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        transition={springDefault}
        className="mt-4 flex w-full items-center gap-3 rounded-md bg-brand-blue/12 px-4 py-3 text-left transition-colors active:bg-brand-blue/20 disabled:opacity-60"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-on-primary">
          <Sparkle size={18} weight="fill" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">
            {aiConfig ? "Rebuild my plan" : "Help build my plan"}
          </span>
          <span className="block truncate text-sm text-muted">
            {aiConfig
              ? `${splitDisplayName(aiConfig)}, ${aiConfig.trainingDays.length} days a week`
              : "Pick a split and your days. AI fills in the week."}
          </span>
        </span>
        <CaretRight size={16} className="shrink-0 text-muted" />
      </motion.button>

      {showAssistant && (
        <PlanAssistantModal
          userId={userId}
          activePlan={activePlan}
          onClose={() => setShowAssistant(false)}
          onError={onError}
          onSaved={(start) => {
            setShowAssistant(false);
            setWeekStart(start);
          }}
        />
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
