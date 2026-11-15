// Deterministic core of the "Help build my plan" assistant. The AI only
// picks exercises and writes copy; which days are training days and which
// split day lands on each of them is decided here, so it's predictable,
// testable, and can't drift week to week.
import type { Exercise, WeeklyPlanDay } from "@/lib/types";
import {
  balanceGroupsFor,
  balanceQuotas,
  exerciseCountFor,
  pickBalancedExercises,
  primaryMuscleGroup,
  matchesWorkoutType,
  PRIMARY_TARGETS,
  MOVEMENT_TYPES,
  toWorkoutExercise,
  WORKOUT_TYPES,
  type PrimaryTarget,
  type WorkoutTypeOption,
} from "@/lib/workoutGeneration";
import { addDays, toDateKey } from "@/lib/weekPlanning";

export type SplitId = "ppl" | "arms-chestback-legs" | "custom";
export type Frequency = "1-2" | "2-3" | "4-5" | "6+";

export const SPLIT_OPTIONS: { id: SplitId; label: string; description: string }[] = [
  { id: "ppl", label: "Push + Pull + Legs", description: "Chest, shoulders and triceps / back and biceps / legs" },
  { id: "arms-chestback-legs", label: "Arms + Chest/Back + Legs", description: "Arms and shoulders / chest and back / legs" },
  { id: "custom", label: "Other", description: "Describe your own split" },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "1-2", label: "1-2" },
  { value: "2-3", label: "2-3" },
  { value: "4-5", label: "4-5" },
  { value: "6+", label: "6+" },
];

// The top of each range: "find a combination of most days selected while
// not encroaching on days off". 6+ stops at 6 so there's always a rest day.
const FREQUENCY_TARGET: Record<Frequency, number> = { "1-2": 2, "2-3": 3, "4-5": 5, "6+": 6 };

export function frequencyTarget(frequency: Frequency): number {
  return FREQUENCY_TARGET[frequency];
}

export const CUSTOM_DESCRIPTION_MAX_WORDS = 30;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function typeById(id: string): WorkoutTypeOption {
  const t = WORKOUT_TYPES.find((w) => w.id === id);
  if (!t) throw new Error(`Unknown workout type ${id}`);
  return t;
}

export function presetRotation(split: Exclude<SplitId, "custom">): WorkoutTypeOption[] {
  return split === "ppl"
    ? [typeById("push"), typeById("pull"), typeById("legs")]
    : [typeById("chest-back"), typeById("arms"), typeById("legs")];
}

/**
 * Turns the AI's reading of a free-text split into rotation entries the
 * exercise generator understands, dropping anything it can't use. Also
 * collapses back-to-back repeats (including last -> first, since the
 * rotation wraps into next week) so no muscle group is trained twice in a
 * row.
 */
export function sanitizeRotation(
  raw: { label?: unknown; movementType?: unknown; targets?: unknown }[],
): WorkoutTypeOption[] {
  const out: WorkoutTypeOption[] = [];
  for (const [i, entry] of raw.entries()) {
    const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 30) : "";
    const movementType = MOVEMENT_TYPES.find((m) => m === entry.movementType);
    const targets = Array.isArray(entry.targets)
      ? (entry.targets.filter((t): t is PrimaryTarget => PRIMARY_TARGETS.includes(t as PrimaryTarget)) as PrimaryTarget[])
      : [];
    if (!label || (!movementType && targets.length === 0)) continue;
    out.push({
      id: `custom-${i}`,
      label,
      description: movementType ?? targets.join(", "),
      ...(movementType ? { movementType } : { targets: [...new Set(targets)] }),
    });
  }
  const key = (t: WorkoutTypeOption) => t.movementType ?? [...(t.targets ?? [])].sort().join("+");
  const deduped = out.filter((t, i) => i === 0 || key(t) !== key(out[i - 1]));
  while (deduped.length > 1 && key(deduped[0]) === key(deduped[deduped.length - 1])) deduped.pop();
  return deduped.slice(0, 7);
}

/**
 * Which days of the week (0 = Sunday) to train. Never uses a day off; when
 * the requested frequency asks for more days than are free, every free day
 * is used. Otherwise the days are spread out: fewest back-to-back days
 * (counting Saturday -> next Sunday), then the widest smallest gap, then
 * earliest in the week.
 */
export function chooseTrainingDays(daysOff: number[], frequency: Frequency): number[] {
  const off = new Set(daysOff);
  // Ties go to the combination starting earliest from Monday, so a
  // 3-day week is Mon/Wed/Fri rather than Sun/Tue/Thu.
  const free = [1, 2, 3, 4, 5, 6, 0].filter((d) => !off.has(d));
  const count = Math.min(FREQUENCY_TARGET[frequency], free.length);
  if (count === free.length) return [...free].sort((a, b) => a - b);

  let best: number[] = [];
  let bestScore: [number, number] = [Infinity, -Infinity];
  const pick = (start: number, chosen: number[]) => {
    if (chosen.length === count) {
      const days = [...chosen].sort((a, b) => a - b);
      let adjacent = 0;
      let minGap = 7;
      for (let i = 0; i < days.length; i++) {
        const next = i + 1 < days.length ? days[i + 1] : days[0] + 7;
        const gap = next - days[i];
        if (gap === 1) adjacent++;
        minGap = Math.min(minGap, gap);
      }
      if (adjacent < bestScore[0] || (adjacent === bestScore[0] && minGap > bestScore[1])) {
        best = days;
        bestScore = [adjacent, minGap];
      }
      return;
    }
    for (let i = start; i < free.length; i++) pick(i + 1, [...chosen, free[i]]);
  };
  pick(0, []);
  return best;
}

export interface AiPlanConfig {
  version: 1;
  split: SplitId;
  customDescription?: string;
  rotation: WorkoutTypeOption[];
  daysOff: number[];
  frequency: Frequency;
  trainingDays: number[];
  // The week the plan started and which rotation entry its first training
  // day got. Every later week's assignment follows from these two.
  anchorWeek: string;
  anchorIndex: number;
  // Weeks already filled in automatically, so a week the user clears on
  // purpose isn't refilled behind their back.
  generatedWeeks: string[];
}

function weekKeyToDate(key: string): Date {
  const [y, m, d] = key.replace(/^w/, "").split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weeksBetween(fromKey: string, toKey: string): number {
  const ms = weekKeyToDate(toKey).getTime() - weekKeyToDate(fromKey).getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export function nextWeekKey(key: string): string {
  return toDateKey(addDays(weekKeyToDate(key), 7));
}

export function previousWeekKey(key: string): string {
  return toDateKey(addDays(weekKeyToDate(key), -7));
}

export interface PlannedSlot {
  dayOfWeek: number;
  type: WorkoutTypeOption;
}

/**
 * The split day for each training day of a given week. The rotation runs
 * continuously across weeks instead of restarting every Sunday: if last
 * week ended on Push, this week starts on Pull. That's what keeps a
 * Saturday Push from being followed by a Sunday Push, and keeps every
 * muscle group getting the same share of sessions over time.
 */
export function slotsForWeek(config: AiPlanConfig, weekKey: string): PlannedSlot[] {
  const len = config.rotation.length;
  if (len === 0) return [];
  const sessionsBefore = weeksBetween(config.anchorWeek, weekKey) * config.trainingDays.length;
  return config.trainingDays.map((dayOfWeek, i) => {
    const index = (((config.anchorIndex + sessionsBefore + i) % len) + len) % len;
    return { dayOfWeek, type: config.rotation[index] };
  });
}

/**
 * When starting a new plan over an existing one, pick the rotation entry
 * to start on so the first session doesn't repeat what the user trained
 * last (their most recent planned day before this week).
 */
export function chooseAnchorIndex(rotation: WorkoutTypeOption[], lastTitle?: string | null): number {
  if (!lastTitle) return 0;
  const last = rotation.findIndex((t) => lastTitle.toLowerCase().startsWith(t.label.toLowerCase()));
  return last === -1 ? 0 : (last + 1) % rotation.length;
}

// --- Exercise selection -----------------------------------------------------

export interface CandidateExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment?: string;
}

export interface BuildWeekRequestSlot {
  dayOfWeek: number;
  splitLabel: string;
  focus: string;
  // Exercises per primary muscle group, e.g. { Chest: 2, Shoulders: 2, Triceps: 1 }.
  balance: Record<string, number>;
  candidates: CandidateExercise[];
}

export interface BuildWeekResponse {
  days: { dayOfWeek: number; title?: string; exerciseIds: string[] }[];
  summary?: string;
}

/**
 * Candidate exercises for a slot, without last week's picks when there
 * are enough others, so each week brings new movements.
 */
export function candidatesFor(
  library: Exercise[],
  type: WorkoutTypeOption,
  avoidIds: Set<string>,
): Exercise[] {
  const matching = library.filter((ex) => matchesWorkoutType(ex, type));
  // Decided per muscle group, so a group with few exercises (calves) can
  // still repeat one rather than come up empty.
  const quotas = balanceQuotas(balanceGroupsFor(type), exerciseCountFor(type));
  const byGroup = new Map<string, Exercise[]>();
  for (const ex of matching) {
    const g = primaryMuscleGroup(ex) ?? "";
    byGroup.set(g, [...(byGroup.get(g) ?? []), ex]);
  }
  return [...byGroup.entries()].flatMap(([g, exercises]) => {
    const fresh = exercises.filter((ex) => !avoidIds.has(ex.id));
    return fresh.length >= Math.max(1, quotas[g] ?? 0) ? fresh : exercises;
  });
}

/**
 * Turns the AI's picks (or nothing, if the AI was unavailable) into plan
 * days. Only ids from that slot's own candidate list are considered, and
 * they're run through the same muscle-group balancing as the built-in
 * generator: a Push day always gets chest, shoulders and triceps in a
 * 2/2/1 split, whatever the AI sent. Missing slots are filled at random
 * from the short groups.
 */
export function assembleWeek(
  slots: PlannedSlot[],
  library: Exercise[],
  avoidIds: Set<string>,
  ai: BuildWeekResponse | null,
  base: { weeklyPlanId: string; weekStartDate: string },
): Omit<WeeklyPlanDay, "id" | "createdAt">[] {
  const usedThisWeek = new Set<string>();
  return slots.map((slot) => {
    const all = candidatesFor(library, slot.type, avoidIds);
    // Avoid repeating an exercise within the week where the group allows it.
    const unused = all.filter((ex) => !usedThisWeek.has(ex.id));
    const candidates = unused.length >= exerciseCountFor(slot.type) ? unused : all;
    const byId = new Map(candidates.map((ex) => [ex.id, ex]));
    const aiDay = ai?.days.find((d) => d.dayOfWeek === slot.dayOfWeek);
    const preferred = (aiDay?.exerciseIds ?? []).flatMap((id) => byId.get(id) ?? []);
    const picked = pickBalancedExercises(candidates, slot.type, preferred);
    for (const ex of picked) usedThisWeek.add(ex.id);
    const aiTitle = aiDay?.title?.trim().slice(0, 40);
    return {
      weeklyPlanId: base.weeklyPlanId,
      weekStartDate: base.weekStartDate,
      dayOfWeek: slot.dayOfWeek,
      title: aiTitle ? `${slot.type.label} Day: ${aiTitle}` : `${slot.type.label} Day`,
      isRestDay: false,
      exercises: picked.map(toWorkoutExercise),
    };
  });
}

export function toRequestSlots(
  slots: PlannedSlot[],
  library: Exercise[],
  avoidIds: Set<string>,
): BuildWeekRequestSlot[] {
  return slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    splitLabel: slot.type.label,
    focus: slot.type.movementType
      ? `${slot.type.movementType} movements (${slot.type.description})`
      : `Muscle groups: ${(slot.type.targets ?? []).join(", ")}`,
    balance: balanceQuotas(balanceGroupsFor(slot.type), exerciseCountFor(slot.type)),
    candidates: candidatesFor(library, slot.type, avoidIds).map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscleGroups: ex.muscleGroups,
      ...(ex.equipment ? { equipment: ex.equipment } : {}),
    })),
  }));
}
