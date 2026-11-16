import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowsClockwise, Check, CircleNotch, Info, Sparkle, X } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StepTrack } from "@/components/ui/StepTrack";
import { cn } from "@/lib/cn";
import { springDefault } from "@/lib/motion";
import { apiGet } from "@/lib/api";
import { useExercises } from "@/lib/queries/exercises";
import { useWorkoutSessions } from "@/lib/queries/workoutSessions";
import {
  generateWeek,
  interpretSplit,
  savePlanConfig,
  saveWeek,
  splitDisplayName,
  type GeneratedWeek,
} from "@/lib/queries/planAssistant";
import {
  chooseAnchorIndex,
  chooseTrainingDays,
  countWords,
  CUSTOM_DESCRIPTION_MAX_WORDS,
  FREQUENCY_OPTIONS,
  frequencyTarget,
  nextWeekKey,
  presetRotation,
  previousWeekKey,
  sanitizeRotation,
  SPLIT_OPTIONS,
  type AiPlanConfig,
  type Frequency,
  type SplitId,
} from "@/lib/planBuilder";
import { DAY_LABELS, FULL_DAY_LABELS, formatWeekRange, startOfWeek, addDays, toDateKey } from "@/lib/weekPlanning";
import type { WeeklyPlanDay, WeeklyWorkoutPlan } from "@/lib/types";
import type { WorkoutTypeOption } from "@/lib/workoutGeneration";

type Step = "split" | "describe" | "daysOff" | "frequency" | "building" | "preview";
type StartWeek = "this" | "next";

const STEP_LABELS = ["Split", "Days off", "Workouts", "Review"];

// How often the user has actually been training: completed workouts over
// the last four weeks, mapped onto the frequency buckets. Null when there's
// no recent history to go on.
function frequencyFromHistory(startTimes: string[], now: Date): Frequency | null {
  const since = now.getTime() - 28 * 24 * 60 * 60 * 1000;
  const recent = startTimes.filter((t) => new Date(t).getTime() >= since).length;
  if (recent === 0) return null;
  const perWeek = recent / 4;
  if (perWeek <= 2) return "1-2";
  if (perWeek <= 3) return "2-3";
  if (perWeek <= 5) return "4-5";
  return "6+";
}

function listDays(days: number[]): string {
  const names = days.map((d) => FULL_DAY_LABELS[d]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function PlanAssistantModal({
  userId,
  activePlan,
  onClose,
  onSaved,
  onError,
}: {
  userId: string;
  activePlan: WeeklyWorkoutPlan | undefined;
  onClose: () => void;
  onSaved: (weekStart: Date) => void;
  onError: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const { data: library } = useExercises();
  const { data: sessions } = useWorkoutSessions(userId);

  const today = new Date();
  const thisWeekStart = startOfWeek(today);
  const thisWeekKey = toDateKey(thisWeekStart);
  const todayDow = today.getDay();

  const previous = activePlan?.aiConfig ?? null;
  const [step, setStep] = useState<Step>("split");
  const [split, setSplit] = useState<SplitId | null>(previous?.split ?? null);
  const [description, setDescription] = useState(previous?.customDescription ?? "");
  const [rotation, setRotation] = useState<WorkoutTypeOption[]>([]);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [daysOff, setDaysOff] = useState<number[]>(previous?.daysOff ?? []);
  const [frequency, setFrequency] = useState<Frequency | null>(previous?.frequency ?? null);
  // Set when the frequency was filled in from the user's recent workouts.
  const [frequencyFromLog, setFrequencyFromLog] = useState(false);
  const [startWeek, setStartWeek] = useState<StartWeek>("this");
  const [result, setResult] = useState<{ config: AiPlanConfig; week: GeneratedWeek; fromDay: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const words = countWords(description);
  const trainingDays = frequency ? chooseTrainingDays(daysOff, frequency) : [];

  async function handleSplitContinue() {
    if (split === "custom") {
      setStep("describe");
    } else if (split) {
      setRotation(presetRotation(split));
      setStep("daysOff");
    }
  }

  async function handleDescribeContinue() {
    if (!description.trim() || words > CUSTOM_DESCRIPTION_MAX_WORDS) return;
    setInterpreting(true);
    setDescriptionError(null);
    try {
      const res = await interpretSplit(description.trim());
      const clean = sanitizeRotation(res.rotation);
      if (!res.valid || clean.length === 0) {
        setDescriptionError(res.reason || "That doesn't read like a workout split. Try naming the days, like \"upper, lower\".");
        return;
      }
      setRotation(clean);
      setStep("daysOff");
    } catch (err) {
      setDescriptionError(err instanceof Error ? err.message : "Couldn't read that split. Try again.");
    } finally {
      setInterpreting(false);
    }
  }

  function toggleDayOff(day: number) {
    setDaysOff((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  // What the user last trained before the plan starts, so the rotation
  // picks up after it instead of repeating it.
  async function lastPlannedTitle(weekKey: string, fromDay: number): Promise<string | null> {
    if (!activePlan) return null;
    const load = (key: string) =>
      apiGet<WeeklyPlanDay[]>("weeklyPlanDays", { action: "list", weeklyPlanId: activePlan.id, weekStartDate: key }).catch(
        () => [] as WeeklyPlanDay[],
      );
    const latest = (days: WeeklyPlanDay[]) =>
      [...days].filter((d) => !d.isRestDay && d.title).sort((a, b) => b.dayOfWeek - a.dayOfWeek)[0]?.title ?? null;
    if (fromDay > 0) {
      const earlier = latest((await load(weekKey)).filter((d) => d.dayOfWeek < fromDay));
      if (earlier) return earlier;
    }
    return latest(await load(previousWeekKey(weekKey)));
  }

  async function build(which: StartWeek) {
    if (!frequency || !split || !library || rotation.length === 0) return;
    // Starting this week only plans from today on; if every training day
    // this week is already behind us, start next week instead.
    let start = which;
    if (start === "this" && !trainingDays.some((d) => d >= todayDow)) start = "next";
    setStartWeek(start);
    const weekKey = start === "this" ? thisWeekKey : nextWeekKey(thisWeekKey);
    const fromDay = start === "this" ? todayDow : 0;

    setStep("building");
    try {
      const lastTitle = await lastPlannedTitle(weekKey, fromDay);
      const firstIndex = chooseAnchorIndex(rotation, lastTitle);
      const skipped = trainingDays.filter((d) => d < fromDay).length;
      const len = rotation.length;
      const config: AiPlanConfig = {
        version: 1,
        split,
        ...(split === "custom" ? { customDescription: description.trim() } : {}),
        rotation,
        daysOff,
        frequency,
        trainingDays,
        anchorWeek: weekKey,
        anchorIndex: (((firstIndex - skipped) % len) + len) % len,
        generatedWeeks: [weekKey],
      };
      const week = await generateWeek({ config, weekKey, library, weeklyPlanId: activePlan?.id ?? null, fromDay });
      setResult({ config, week, fromDay });
      setStep("preview");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't build your plan. Try again.");
      setStep("frequency");
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const plan = await savePlanConfig(queryClient, userId, activePlan, result.config);
      await saveWeek(queryClient, plan.id, result.config.anchorWeek, result.week.days, result.fromDay);
      // Weeks the old plan already filled in ahead of time would keep the
      // old split; clear them so they're rebuilt from this plan when opened.
      const stale = (previous?.generatedWeeks ?? []).filter((key) => key > result.config.anchorWeek);
      await Promise.all(stale.map((key) => saveWeek(queryClient, plan.id, key, [])));
      onSaved(startWeek === "this" ? thisWeekStart : addDays(thisWeekStart, 7));
    } catch {
      onError("Couldn't save your plan. Check your connection and try again.");
      setSaving(false);
    }
  }

  // Fill in what we already know: a first-time plan starts from how often
  // the user has actually been working out.
  function goToFrequency() {
    if (!frequency && sessions) {
      const fromLog = frequencyFromHistory(
        sessions.filter((s) => !s.isActive).map((s) => s.startTime),
        today,
      );
      if (fromLog) {
        setFrequency(fromLog);
        setFrequencyFromLog(true);
      }
    }
    setStep("frequency");
  }

  function goBack() {
    const order: Step[] = ["split", ...(split === "custom" ? (["describe"] as Step[]) : []), "daysOff", "frequency", "preview"];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
  }

  const optionClass = (selected: boolean) =>
    cn(
      "flex w-full items-center justify-between gap-3 rounded-md px-4 py-3.5 text-left transition-[background-color,transform] duration-100 active:scale-[0.98]",
      selected ? "bg-brand-blue/12 ring-2 ring-brand-blue" : "bg-surface-soft hover:bg-surface-card active:bg-surface-strong",
    );

  const stepIndex = { split: 0, describe: 0, daysOff: 1, frequency: 2, building: 3, preview: 3 }[step];

  return (
    <Modal onClose={onClose} ariaLabel="Help build my plan" className="md:max-w-lg">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          {step !== "split" && step !== "building" && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <Sparkle size={18} weight="fill" className="text-brand-blue" />
          <p className="text-base font-semibold text-ink">Help build my plan</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 pb-5">
        <StepTrack steps={STEP_LABELS} current={stepIndex} className="mb-5" />

        {step === "split" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">What split do you want to train?</p>
            {SPLIT_OPTIONS.map((option) => (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => setSplit(option.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={springDefault}
                aria-pressed={split === option.id}
                className={optionClass(split === option.id)}
              >
                <span>
                  <span className="block text-base font-semibold text-ink">{option.label}</span>
                  <span className="block text-sm text-muted">{option.description}</span>
                </span>
                {split === option.id && <Check size={18} weight="bold" className="shrink-0 text-brand-blue" />}
              </motion.button>
            ))}
            <Button className="mt-2" disabled={!split} onClick={handleSplitContinue}>
              Continue
            </Button>
          </div>
        )}

        {step === "describe" && (
          <div className="flex flex-col gap-3">
            <label htmlFor="split-description" className="text-sm text-muted">
              Describe your split in {CUSTOM_DESCRIPTION_MAX_WORDS} words or fewer.
            </label>
            <textarea
              id="split-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError(null);
              }}
              rows={3}
              maxLength={300}
              placeholder="e.g. Upper body one day, lower body the next"
              className="w-full resize-none rounded-md border border-transparent bg-surface-card px-3.5 py-3 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-soft focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
            />
            <div className="flex items-start justify-between gap-3 text-sm">
              <p className={cn("text-error", !descriptionError && "invisible")} role="alert">
                {descriptionError ?? "."}
              </p>
              <p className={cn("tabular shrink-0", words > CUSTOM_DESCRIPTION_MAX_WORDS ? "text-error" : "text-muted")}>
                {words}/{CUSTOM_DESCRIPTION_MAX_WORDS} words
              </p>
            </div>
            <Button
              disabled={!description.trim() || words > CUSTOM_DESCRIPTION_MAX_WORDS || interpreting}
              onClick={handleDescribeContinue}
            >
              {interpreting && <CircleNotch size={16} className="animate-spin" />}
              {interpreting ? "Reading your split" : "Continue"}
            </Button>
          </div>
        )}

        {step === "daysOff" && (
          <div className="flex flex-col gap-3">
            {split === "custom" && rotation.length > 0 && (
              <p className="rounded-md bg-surface-soft px-4 py-3 text-sm text-ink">
                Got it: <span className="font-semibold">{splitDisplayName({ rotation })}</span>, on repeat.
              </p>
            )}
            <p className="text-sm text-muted">Which days do you want off? Pick none if you're flexible.</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((label, day) => {
                const off = daysOff.includes(day);
                return (
                  <motion.button
                    key={day}
                    type="button"
                    onClick={() => toggleDayOff(day)}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    transition={springDefault}
                    aria-pressed={off}
                    aria-label={`${FULL_DAY_LABELS[day]} off`}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-md text-sm font-semibold transition-colors",
                      off ? "bg-brand-blue text-on-primary" : "bg-surface-soft text-ink",
                    )}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-sm text-muted">
              {daysOff.length === 0
                ? "No days off picked."
                : daysOff.length === 7
                  ? "Leave at least one day open to train."
                  : `Off: ${listDays(daysOff)}.`}
            </p>
            <Button className="mt-1" disabled={daysOff.length === 7} onClick={goToFrequency}>
              Continue
            </Button>
          </div>
        )}

        {step === "frequency" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              How many workouts a week?
              {frequencyFromLog && " We picked what you've averaged over the last 4 weeks."}
            </p>
            <div role="radiogroup" aria-label="Workouts per week" className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={frequency === option.value}
                  onClick={() => {
                    setFrequency(option.value);
                    setFrequencyFromLog(false);
                  }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  transition={springDefault}
                  className={optionClass(frequency === option.value)}
                >
                  <span className="text-base font-semibold text-ink">{option.label}</span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border-2",
                      frequency === option.value ? "border-brand-blue bg-brand-blue" : "border-muted-soft",
                    )}
                  >
                    {frequency === option.value && <span className="size-2 rounded-full bg-white" />}
                  </span>
                </motion.button>
              ))}
            </div>
            {frequency && (
              <p className="rounded-md bg-surface-soft px-4 py-3 text-sm text-ink">
                {trainingDays.length < frequencyTarget(frequency)
                  ? `With ${daysOff.length} ${daysOff.length === 1 ? "day" : "days"} off, that fits ${trainingDays.length} ${trainingDays.length === 1 ? "workout" : "workouts"}: `
                  : `${trainingDays.length} workouts: `}
                <span className="font-semibold">{listDays(trainingDays)}</span>.
              </p>
            )}
            <Button className="mt-1" disabled={!frequency || !library} onClick={() => build("this")}>
              <Sparkle size={16} weight="fill" />
              Build my plan
            </Button>
          </div>
        )}

        {step === "building" && (
          <div className="flex flex-col items-center gap-3 py-12 text-center" aria-live="polite">
            <CircleNotch size={28} className="animate-spin text-brand-blue" />
            <p className="text-base font-semibold text-ink">Building your week</p>
            <p className="max-w-xs text-sm text-muted">Picking exercises for each day and balancing your muscle groups.</p>
          </div>
        )}

        {step === "preview" && result && (
          <div className="flex flex-col gap-4">
            <SegmentedControl<StartWeek>
              ariaLabel="When to start"
              options={[
                { value: "this", label: "Start this week" },
                { value: "next", label: "Start next week" },
              ]}
              value={startWeek}
              onChange={(value) => value !== startWeek && build(value)}
            />
            {!result.week.usedAi && (
              <p className="flex items-start gap-2.5 rounded-md bg-surface-soft px-4 py-3 text-sm text-ink">
                <Info size={18} className="mt-px shrink-0 text-muted" />
                The AI coach couldn't be reached, so these exercises came from the built-in picker. Tap New exercises to
                try the AI again.
              </p>
            )}
            <p className="text-sm text-muted">
              {splitDisplayName(result.config)} · Week of{" "}
              {formatWeekRange(startWeek === "this" ? thisWeekStart : addDays(thisWeekStart, 7))}
            </p>
            {result.week.summary && <p className="text-sm text-ink">{result.week.summary}</p>}

            <ul className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const day = result.week.days.find((d) => d.dayOfWeek === dow);
                const past = dow < result.fromDay;
                return (
                  <li
                    key={dow}
                    className={cn("rounded-md px-4 py-3", day ? "bg-surface-soft" : "bg-transparent", past && "opacity-50")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{FULL_DAY_LABELS[dow]}</p>
                      <p className={cn("text-sm", day ? "font-medium text-brand-blue" : "text-muted")}>
                        {day ? day.title : past ? "Unchanged" : "Rest"}
                      </p>
                    </div>
                    {day && (
                      <p className="mt-1 text-sm text-muted">{day.exercises.map((ex) => ex.name).join(", ")}</p>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="px-1 text-sm text-muted">
              Tap any day in your weekly plan to change it. Each new week gets fresh exercises, and the split keeps
              rotating so the same muscle group never lands on back-to-back days.
            </p>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={saving} onClick={() => build(startWeek)}>
                <ArrowsClockwise size={16} />
                New exercises
              </Button>
              <Button className="flex-1" disabled={saving} onClick={handleSave}>
                {saving && <CircleNotch size={16} className="animate-spin" />}
                {saving ? "Saving" : "Save plan"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
