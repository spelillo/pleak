// Validation for user-created exercise names: letters and single spaces only,
// plus a profanity screen. The letters-only and length rules are mirrored by a
// check constraint on public.exercises for custom (user-owned) rows.

export const EXERCISE_NAME_MAX_LENGTH = 40;
const LETTERS_AND_SPACES = /^\p{L}+( \p{L}+)*$/u;

// Roots that are offensive wherever they appear inside a word.
const BLOCKED_ROOTS = [
  "fuck", "fuk", "shit", "cunt", "bitch", "bastard", "nigger", "nigga", "faggot",
  "whore", "slut", "dildo", "wank", "twat", "pussy", "retard", "rapist", "nazi",
  "motherf", "asshole", "jackass", "dumbass", "bullshit", "porn", "penis", "vagina",
];

// Words that are only offensive on their own (they appear inside innocent
// words, e.g. "Peacock", "Scunthorpe", "Classic", "Hello").
const BLOCKED_WORDS = new Set([
  "ass", "arse", "cock", "dick", "fag", "hell", "damn", "crap", "piss", "tit", "tits",
  "boob", "boobs", "cum", "jizz", "homo", "spic", "chink", "kike", "coon", "sex", "anal",
  "butt", "turd", "prick", "knob", "bollocks", "wtf", "stfu", "milf",
]);

/** Collapses runs of whitespace and trims the ends. */
export function normalizeExerciseName(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export function containsProfanity(name: string) {
  const lower = name.toLowerCase();
  // Also check with spaces removed, so "f u c k" doesn't slip through.
  const squashed = lower.replace(/\s+/g, "");
  if (BLOCKED_ROOTS.some((root) => lower.includes(root) || squashed.includes(root))) return true;
  return lower.split(" ").some((word) => BLOCKED_WORDS.has(word));
}

/** Returns an error message for the name, or null when it's acceptable. */
export function validateExerciseName(raw: string): string | null {
  const name = normalizeExerciseName(raw);
  if (!name) return "Enter a name.";
  if (!LETTERS_AND_SPACES.test(name)) return "Use letters and spaces only.";
  if (name.length < 2) return "Name is too short.";
  if (name.length > EXERCISE_NAME_MAX_LENGTH) return `Keep it under ${EXERCISE_NAME_MAX_LENGTH} characters.`;
  if (containsProfanity(name)) return "That name isn't allowed. Try another.";
  return null;
}
