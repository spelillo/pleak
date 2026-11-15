import { supabase } from "@/lib/supabase";
import type { Exercise } from "@/lib/types";

// "Did you mean…?" lookup for the create-exercise popup. Asks the server
// (Groq, via api/exercise-match.ts) whether the library already has the same
// movement under another name. If that's unavailable or slow, a local
// name comparison catches the obvious cases (word order, plurals, typos).

const ENDPOINT = `${import.meta.env.BASE_URL}api/exercise-match`;
const AI_TIMEOUT_MS = 6000;

interface NewExercise {
  name: string;
  muscleGroups: string[];
  movementType: string;
}

function tokens(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\p{L} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .sort();
}

function levenshtein(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Closest library exercise by name alone, or null if none is close. */
export function findSimilarByName(name: string, library: Exercise[]): Exercise | null {
  const key = tokens(name).join(" ");
  if (!key) return null;
  let best: { ex: Exercise; score: number } | null = null;
  for (const ex of library) {
    const other = tokens(ex.name).join(" ");
    if (!other) continue;
    const score = 1 - levenshtein(key, other) / Math.max(key.length, other.length);
    if (score >= 0.85 && (!best || score > best.score)) best = { ex, score };
  }
  return best?.ex ?? null;
}

async function askServer(input: NewExercise, library: Exercise[]): Promise<Exercise | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No session");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...input,
        candidates: library.map((ex) => ({
          id: ex.id,
          name: ex.name,
          muscleGroups: ex.muscleGroups,
          movementType: ex.movementType,
        })),
      }),
    });
    if (!res.ok) throw new Error(`exercise-match ${res.status}`);
    const { matchId } = (await res.json()) as { matchId?: string | null };
    return (matchId && library.find((ex) => ex.id === matchId)) || null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The library exercise the new one most likely duplicates, or null. Never
 * throws: if the AI check fails, only the local name match is used.
 */
export async function findSimilarExercise(input: NewExercise, library: Exercise[]): Promise<Exercise | null> {
  if (library.length === 0) return null;
  try {
    // The AI judges meaning; the name match backs it up on near-identical
    // spellings it might wave through.
    return (await askServer(input, library)) ?? findSimilarByName(input.name, library);
  } catch {
    return findSimilarByName(input.name, library);
  }
}
