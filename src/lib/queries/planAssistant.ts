import type { QueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  assembleWeek,
  previousWeekKey,
  slotsForWeek,
  toRequestSlots,
  type AiPlanConfig,
  type BuildWeekResponse,
} from "@/lib/planBuilder";
import type { Exercise, WeeklyPlanDay, WeeklyWorkoutPlan } from "@/lib/types";

const ENDPOINT = `${import.meta.env.BASE_URL}api/plan-builder`;

export class PlanAssistantError extends Error {}

async function callAssistant<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new PlanAssistantError("Sign in again to use the plan assistant.");
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PlanAssistantError("Couldn't reach the plan assistant. Check your connection.");
  }
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new PlanAssistantError(payload.error || "The plan assistant isn't available right now.");
  return payload;
}

export function interpretSplit(description: string) {
  return callAssistant<{
    valid: boolean;
    reason: string;
    rotation: { label?: unknown; movementType?: unknown; targets?: unknown }[];
  }>({ action: "interpretSplit", description });
}

export function splitDisplayName(config: Pick<AiPlanConfig, "rotation">): string {
  return config.rotation.map((t) => t.label).join(" + ");
}

export interface GeneratedWeek {
  days: Omit<WeeklyPlanDay, "id" | "createdAt">[];
  summary: string;
  usedAi: boolean;
}

/**
 * Builds one week of the plan: the deterministic slots for that week,
 * minus any before `fromDay` (days already behind us when starting
 * mid-week), with exercises picked by the AI and avoiding last week's. If
 * the AI is unreachable the week is still built, from the regular
 * generator, so the plan never comes back empty.
 */
export async function generateWeek({
  config,
  weekKey,
  library,
  weeklyPlanId,
  fromDay = 0,
}: {
  config: AiPlanConfig;
  weekKey: string;
  library: Exercise[];
  weeklyPlanId: string | null;
  fromDay?: number;
}): Promise<GeneratedWeek> {
  const slots = slotsForWeek(config, weekKey).filter((s) => s.dayOfWeek >= fromDay);
  const previous = weeklyPlanId
    ? await apiGet<WeeklyPlanDay[]>("weeklyPlanDays", {
        action: "list",
        weeklyPlanId,
        weekStartDate: previousWeekKey(weekKey),
      }).catch(() => [])
    : [];
  const avoidIds = new Set(previous.flatMap((d) => d.exercises.map((ex) => ex.exerciseId)));

  let ai: (BuildWeekResponse & { summary?: string }) | null = null;
  if (slots.length > 0) {
    try {
      ai = await callAssistant<BuildWeekResponse>({
        action: "buildWeek",
        splitName: splitDisplayName(config),
        slots: toRequestSlots(slots, library, avoidIds),
      });
    } catch (err) {
      console.warn("Plan assistant unavailable, using the built-in generator", err);
    }
  }
  const days = assembleWeek(slots, library, avoidIds, ai, { weeklyPlanId: weeklyPlanId ?? "", weekStartDate: weekKey });
  return { days, summary: ai?.summary ?? "", usedAi: !!ai };
}

function daysKey(weeklyPlanId: string, weekStartDate: string) {
  return ["weeklyPlanDays", weeklyPlanId, weekStartDate] as const;
}

/**
 * Writes a generated week. Days from `fromDay` on are replaced: a day that
 * already exists keeps its row id, and planned days the new week doesn't
 * use are removed. Days before `fromDay` are left alone.
 */
export async function saveWeek(
  queryClient: QueryClient,
  weeklyPlanId: string,
  weekKey: string,
  days: Omit<WeeklyPlanDay, "id" | "createdAt">[],
  fromDay = 0,
) {
  const existing = await apiGet<WeeklyPlanDay[]>("weeklyPlanDays", {
    action: "list",
    weeklyPlanId,
    weekStartDate: weekKey,
  });
  const now = new Date().toISOString();
  const toSave: WeeklyPlanDay[] = days.map((day) => {
    const match = existing.find((e) => e.dayOfWeek === day.dayOfWeek);
    return { ...day, weeklyPlanId, weekStartDate: weekKey, id: match?.id ?? crypto.randomUUID(), createdAt: match?.createdAt ?? now };
  });
  const keepDays = new Set(toSave.map((d) => d.dayOfWeek));
  const toDelete = existing.filter((e) => e.dayOfWeek >= fromDay && !keepDays.has(e.dayOfWeek));

  await Promise.all([
    ...toSave.map((day) => apiPost<WeeklyPlanDay>("weeklyPlanDays", "upsert", { ...day })),
    ...toDelete.map((day) => apiPost("weeklyPlanDays", "delete", { id: day.id })),
  ]);
  const deletedIds = new Set(toDelete.map((d) => d.id));
  queryClient.setQueryData<WeeklyPlanDay[]>(daysKey(weeklyPlanId, weekKey), [
    ...existing.filter((e) => !deletedIds.has(e.id) && !keepDays.has(e.dayOfWeek)),
    ...toSave,
  ]);
}

export async function savePlanConfig(
  queryClient: QueryClient,
  userId: string,
  plan: WeeklyWorkoutPlan | undefined,
  config: AiPlanConfig,
): Promise<WeeklyWorkoutPlan> {
  const saved = plan
    ? await apiPost<WeeklyWorkoutPlan>("weeklyWorkoutPlans", "update", { id: plan.id, aiConfig: config })
    : await apiPost<WeeklyWorkoutPlan>("weeklyWorkoutPlans", "create", {
        userId,
        name: "My Plan",
        isActive: true,
        aiConfig: config,
      });
  queryClient.setQueryData<WeeklyWorkoutPlan[]>(["weeklyWorkoutPlans", userId], (old) => [
    ...(old ?? []).filter((p) => p.id !== saved.id),
    saved,
  ]);
  return saved;
}
