export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// A "w"-prefixed local YYYY-MM-DD, used as the stable week key stored in
// WeeklyPlanDay.weekStartDate. The prefix is deliberate: a bare date-shaped
// string ("2026-08-16") gets silently auto-converted to a Date cell by
// Google Sheets, and read back as a full ISO timestamp shifted by the
// spreadsheet's timezone ("2026-08-16T04:00:00.000Z") — which then fails
// the backend's exact-string list filter and the day never shows as
// planned even though it saved. Prefixing keeps it plain text.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `w${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)} - ${fmt(end)}`;
}
