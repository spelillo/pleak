#!/usr/bin/env node
/**
 * One-time copy of every row from the old Google Sheets backend into
 * Supabase. Reads through the still-deployed Apps Script Web App (the same
 * list endpoint the app used), converts camelCase fields to the snake_case
 * columns in supabase/migrations, and upserts by id, so it is safe to re-run
 * (e.g. once now to test, once more right before cutover).
 *
 * Usage (Node 20.6+):
 *   cp scripts/import.env.example .env.import   # fill it in; it's gitignored
 *   node --env-file=.env.import scripts/import-from-sheets.mjs [--dry-run]
 *
 * Needs the Supabase service_role key because it writes rows for every
 * user, bypassing row-level security. Never put that key in a VITE_ variable
 * or in Vercel's frontend env vars.
 */
import { createClient } from "@supabase/supabase-js";

const {
  SHEETS_API_URL,
  SHEETS_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;
const dryRun = process.argv.includes("--dry-run");

for (const [name, value] of Object.entries({ SHEETS_API_URL, SHEETS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) {
    console.error(`Missing ${name}. See scripts/import.env.example.`);
    process.exit(1);
  }
}

// Parents before children so foreign keys resolve.
const RESOURCES = [
  ["users", "users"],
  ["exercises", "exercises"],
  ["workoutPlans", "workout_plans"],
  ["workoutSessions", "workout_sessions"],
  ["scheduledWorkouts", "scheduled_workouts"],
  ["goals", "goals"],
  ["personalRecords", "personal_records"],
  ["weeklyWorkoutPlans", "weekly_workout_plans"],
  ["weeklyPlanDays", "weekly_plan_days"],
  ["weeklyPlanCompletions", "weekly_plan_completions"],
];

// uuid columns that are loose references (no foreign key). Sheets could hold
// anything there (blank, or a client-side "optimistic-…" placeholder), and
// Postgres rejects a non-uuid, so anything else becomes null.
const SOFT_UUID_COLUMNS = ["plan_id", "exercise_id", "workout_session_id", "session_id"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchSheet(resource) {
  const url = new URL(SHEETS_API_URL);
  url.searchParams.set("resource", resource);
  url.searchParams.set("action", "list");
  url.searchParams.set("apiKey", SHEETS_API_KEY);
  const res = await fetch(url);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error(`${resource}: ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

function toRow(record) {
  const row = {};
  for (const [key, value] of Object.entries(record)) {
    const column = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    row[column] = value === "" ? null : value;
  }
  for (const column of SOFT_UUID_COLUMNS) {
    if (column in row && !(typeof row[column] === "string" && UUID_RE.test(row[column]))) row[column] = null;
  }
  if (typeof row.email === "string") row.email = row.email.toLowerCase();
  // Let the column defaults fill blank timestamps instead of violating NOT NULL.
  for (const column of ["created_at", "updated_at"]) {
    if (row[column] === null) delete row[column];
  }
  return row;
}

const userIds = new Set();
const planIds = new Set();
let failed = false;

for (const [resource, table] of RESOURCES) {
  const records = await fetchSheet(resource);
  const rows = [];
  let skipped = 0;
  for (const record of records) {
    const row = toRow(record);
    if (!row.id || !UUID_RE.test(String(row.id))) {
      skipped++;
      continue;
    }
    // Rows pointing at a user or weekly plan that doesn't exist would fail
    // the foreign key; report and skip them rather than abort the import.
    if ("user_id" in row && row.user_id !== null && !userIds.has(row.user_id) && table !== "exercises") {
      skipped++;
      continue;
    }
    if (table === "exercises" && row.user_id !== null && !userIds.has(row.user_id)) row.user_id = null;
    if ("weekly_plan_id" in row && !planIds.has(row.weekly_plan_id)) {
      skipped++;
      continue;
    }
    rows.push(row);
  }

  if (table === "users") rows.forEach((r) => userIds.add(r.id));
  if (table === "weekly_workout_plans") rows.forEach((r) => planIds.add(r.id));

  if (!dryRun && rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id", defaultToNull: false });
    if (error) {
      failed = true;
      console.error(`${table}: ${error.message}`);
      continue;
    }
  }
  console.log(`${table}: ${rows.length} ${dryRun ? "would be imported" : "imported"}, ${skipped} skipped`);
}

process.exit(failed ? 1 : 0);
