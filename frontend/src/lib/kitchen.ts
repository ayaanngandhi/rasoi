export const SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snacks", label: "Evening Snacks" },
  { key: "dinner", label: "Dinner" },
] as const;

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return isoDate(new Date());
}

/** Sunday of the week containing the given date (Indian convention: weeks run Sun-Sat). */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay());
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function dayName(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

export function shortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * Compact, unambiguous week range, e.g. "16-22 Aug" or "30 Aug - 5 Sep".
 * Appends the year whenever it differs from the current year.
 */
export function weekRangeLabel(days: Date[]): string {
  if (days.length !== 7) return "";
  const a = days[0];
  const b = days[6];
  const now = new Date();
  const yearSuffix = (d: Date) => (d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}${yearSuffix(b)}`;
  }
  return `${shortDate(a)} – ${shortDate(b)}${yearSuffix(b)}`;
}
