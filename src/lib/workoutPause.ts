// Pause state for the active workout timer, persisted per session so it
// survives ActiveWorkout unmounting (switching app tabs) and the PWA being
// reloaded after it's backgrounded. Without this, remounting recomputed
// elapsed time from startTime with no paused time, so a paused timer looked
// like it had kept running.

export interface PauseState {
  // Timestamp (ms) the current pause began, or null while running.
  pausedAt: number | null;
  // Sum of every completed pause interval, in ms.
  totalPausedMs: number;
}

const KEY_PREFIX = "pleak:workout-pause:";
const EMPTY: PauseState = { pausedAt: null, totalPausedMs: 0 };

export function loadPauseState(sessionId: string): PauseState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + sessionId);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PauseState>;
    return {
      pausedAt: typeof parsed.pausedAt === "number" ? parsed.pausedAt : null,
      totalPausedMs: typeof parsed.totalPausedMs === "number" ? parsed.totalPausedMs : 0,
    };
  } catch {
    return EMPTY;
  }
}

export function savePauseState(sessionId: string, state: PauseState) {
  try {
    if (state.pausedAt === null && state.totalPausedMs === 0) {
      localStorage.removeItem(KEY_PREFIX + sessionId);
    } else {
      localStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(state));
    }
  } catch {
    // Storage unavailable (private mode, quota): pause still works in-memory.
  }
}

export function clearPauseState(sessionId: string) {
  try {
    localStorage.removeItem(KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}
