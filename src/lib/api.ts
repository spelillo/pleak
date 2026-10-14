import { isSupabaseConfigured, supabase } from "./supabase";
import type { ResourceName } from "./types";

// Thin data layer over Supabase that keeps the same apiGet/apiPost shape the
// old Apps Script API had, so the query hooks in src/lib/queries didn't need
// to change. Tables and columns are the snake_case form of the resource
// names and fields in types.ts; rows are converted at this boundary.
// Per-user access is enforced by row-level security in the database (see
// supabase/migrations), not here.

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const TABLES: Record<ResourceName, string> = {
  users: "users",
  exercises: "exercises",
  workoutPlans: "workout_plans",
  workoutSessions: "workout_sessions",
  scheduledWorkouts: "scheduled_workouts",
  goals: "goals",
  personalRecords: "personal_records",
  weeklyWorkoutPlans: "weekly_workout_plans",
  weeklyPlanDays: "weekly_plan_days",
  weeklyPlanCompletions: "weekly_plan_completions",
};

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// Only top-level keys are converted; jsonb columns (exercises, muscleGroups)
// keep their camelCase contents as stored.
export function rowToRecord<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) out[toCamel(key)] = value;
  return out as T;
}

function recordToRow(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) out[toSnake(key)] = value;
  }
  return out;
}

function requireConfig() {
  if (!isSupabaseConfigured) {
    throw new ApiError(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
    );
  }
}

function fail(error: { message: string }): never {
  throw new ApiError(error.message);
}

/**
 * action=list (default): every row matching the remaining params as exact
 * equality filters. action=get: the row with params.id, or null.
 */
export async function apiGet<T>(
  resource: ResourceName,
  params: Record<string, string | undefined> = {},
): Promise<T> {
  requireConfig();
  const { action = "list", ...filters } = params;
  let query = supabase.from(TABLES[resource]).select("*");
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) query = query.eq(toSnake(key), value);
  }
  if (action === "get") {
    const { data, error } = await query.maybeSingle();
    if (error) fail(error);
    return (data ? rowToRecord(data) : null) as T;
  }
  const { data, error } = await query;
  if (error) fail(error);
  return (data ?? []).map((row) => rowToRecord(row)) as T;
}

/**
 * create: inserts the payload and returns the stored row.
 * update: patches the row with payload.id and returns the merged row.
 * delete: removes the row with payload.id.
 */
export async function apiPost<T>(
  resource: ResourceName,
  action: "create" | "update" | "delete",
  payload: Record<string, unknown>,
): Promise<T> {
  requireConfig();
  const table = supabase.from(TABLES[resource]);

  if (action === "create") {
    const { data, error } = await table.insert(recordToRow(payload)).select().single();
    if (error) fail(error);
    return rowToRecord<T>(data);
  }

  const { id, ...patch } = payload;
  if (!id) throw new ApiError(`${action} requires an id`);

  if (action === "update") {
    const { data, error } = await table.update(recordToRow(patch)).eq("id", id).select().maybeSingle();
    if (error) fail(error);
    if (!data) throw new ApiError(`No ${resource} row with id ${String(id)}`);
    return rowToRecord<T>(data);
  }

  const { error } = await table.delete().eq("id", id);
  if (error) fail(error);
  return { success: true } as T;
}
