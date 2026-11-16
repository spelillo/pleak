import { supabase } from "@/lib/supabase";
import type { Exercise } from "@/lib/types";

// "Did you mean…?" lookup for the create-exercise popup. Two checks run
// together and their results are merged:
//   - Groq, via api/exercise-match.ts, judges meaning ("Skull Crusher" is a
//     "Lying Triceps Extension") and close variants ("Bench Press" is a
//     "Barbell Bench Press").
//   - A local word match catches the rest, and is all there is if the AI
//     is unreachable or slow: shared words in any order, plurals, small
//     typos, gym abbreviations (DB, BB, RDL…), and one name being a more
//     specific version of the other.

const ENDPOINT = `${import.meta.env.BASE_URL}api/exercise-match`;
const AI_TIMEOUT_MS = 6000;
export const MAX_SUGGESTIONS = 3;

interface NewExercise {
  name: string;
  muscleGroups: string[];
  movementType: string;
}

const ABBREVIATIONS: Record<string, string> = {
  db: "dumbbell",
  dbs: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  kbs: "kettlebell",
  ez: "ez",
  ohp: "overhead press",
  rdl: "romanian deadlift",
  rdls: "romanian deadlift",
  sldl: "stiff leg deadlift",
  bss: "bulgarian split squat",
  pullup: "pull up",
  pullups: "pull up",
  chinup: "chin up",
  chinups: "chin up",
  pushup: "push up",
  pushups: "push up",
  situp: "sit up",
  situps: "sit up",
  skullcrusher: "skull crusher",
  skullcrushers: "skull crusher",
  flye: "fly",
  flyes: "fly",
  flies: "fly",
};

// Words that say nothing about which movement it is.
const FILLER = new Set(["the", "a", "an", "and", "or", "with", "on", "of", "to", "for", "exercise", "movement"]);

function singular(word: string) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("es") && /(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function nameTokens(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/[^\p{L} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (ABBREVIATIONS[w] ?? w).split(" "))
    .map(singular)
    .filter((w) => !FILLER.has(w));
  return Array.from(new Set(words));
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

function sameWord(a: string, b: string) {
  if (a === b) return true;
  const longest = Math.max(a.length, b.length);
  // One typo allowed in words of 5+ letters, two in words of 9+.
  const allowed = longest >= 9 ? 2 : longest >= 5 ? 1 : 0;
  return allowed > 0 && levenshtein(a, b) <= allowed;
}

function countShared(a: string[], b: string[]) {
  return a.filter((w) => b.some((o) => sameWord(w, o))).length;
}

/** 0–1: how likely `other` is the same movement as `name`, by name alone. */
export function nameSimilarity(name: string, other: string): number {
  const a = nameTokens(name);
  const b = nameTokens(other);
  if (a.length === 0 || b.length === 0) return 0;
  const joinedA = [...a].sort().join(" ");
  const joinedB = [...b].sort().join(" ");
  const whole = 1 - levenshtein(joinedA, joinedB) / Math.max(joinedA.length, joinedB.length);
  const shared = countShared(a, b);
  let score = whole >= 0.85 ? whole : 0;
  // Every word of one name is in the other: a more specific (or more
  // general) version of the same lift, e.g. "Bench Press" and "Barbell
  // Bench Press". The closer the word counts, the closer the match.
  if (shared === a.length || shared === b.length) {
    score = Math.max(score, 0.65 + 0.35 * (Math.min(a.length, b.length) / Math.max(a.length, b.length)));
  } else {
    const jaccard = shared / (a.length + b.length - shared);
    if (jaccard >= 0.5) score = Math.max(score, 0.4 + jaccard * 0.4);
  }
  return score;
}

/** Library exercises whose names look like the same movement, best first. */
export function findSimilarByName(name: string, library: Exercise[], limit = MAX_SUGGESTIONS): Exercise[] {
  return library
    .map((ex) => ({ ex, score: nameSimilarity(name, ex.name) }))
    .filter((m) => m.score >= 0.6)
    .sort((x, y) => y.score - x.score || x.ex.name.length - y.ex.name.length)
    .slice(0, limit)
    .map((m) => m.ex);
}

async function askServer(input: NewExercise, library: Exercise[]): Promise<Exercise[]> {
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
    const payload = (await res.json()) as { matchIds?: unknown; matchId?: unknown };
    const ids = Array.isArray(payload.matchIds)
      ? payload.matchIds
      : typeof payload.matchId === "string"
        ? [payload.matchId]
        : [];
    return ids.flatMap((id) => library.find((ex) => ex.id === id) ?? []);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Up to three library exercises the new one may duplicate, closest first
 * (empty when nothing is close). Never throws: if the AI check fails, only
 * the local name match is used.
 */
export async function findSimilarExercises(input: NewExercise, library: Exercise[]): Promise<Exercise[]> {
  if (library.length === 0) return [];
  const local = findSimilarByName(input.name, library);
  const ai = await askServer(input, library).catch(() => [] as Exercise[]);
  const merged: Exercise[] = [];
  for (const ex of [...ai, ...local]) {
    if (!merged.some((m) => m.id === ex.id)) merged.push(ex);
  }
  return merged.slice(0, MAX_SUGGESTIONS);
}
