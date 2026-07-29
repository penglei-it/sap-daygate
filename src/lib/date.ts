/**
 * Date helpers for mapping calendar days to curriculum offsets.
 */

/** Parses YYYY-MM-DD as local date at noon to avoid DST edge cases. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Formats a Date as YYYY-MM-DD in local time. */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference: later - earlier. */
export function diffDays(earlierIso: string, laterIso: string): number {
  const a = parseISODate(earlierIso).getTime();
  const b = parseISODate(laterIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Adds days to an ISO date. */
export function addDays(iso: string, days: number): string {
  const dt = parseISODate(iso);
  dt.setDate(dt.getDate() + days);
  return formatISODate(dt);
}

/** ISO week key YYYY-Www for hour logging. */
export function weekKey(iso: string): string {
  const date = parseISODate(iso);
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
