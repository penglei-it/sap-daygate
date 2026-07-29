import { computeStreak, countMissedLast7 } from '../core/guardian';
import type { DayCheckIn, DayPlan } from '../types/curriculum';

/** One item in the catch-up / upcoming queue. */
export interface CatchUpItem {
  /** Stable key for React lists. */
  key: string;
  /** Day index in the pack. */
  dayIndex: number;
  /** Calendar offset from start date. */
  dateOffset: number;
  /** Short Chinese reason. */
  reason: string;
  /** Optional title for display. */
  title: string;
  /** Kind of queue entry. */
  kind: 'skipped' | 'fail' | 'gate';
}

/**
 * Builds an ordered catch-up queue: skipped, fail, then upcoming unpassed gates.
 * Caps at maxItems for Today UI.
 * @param input.days - Scaled pack days.
 * @param input.packId - Active pack id.
 * @param input.checkIns - Persisted check-ins.
 * @param input.maxItems - Max rows to return.
 */
export function buildCatchUpQueue(input: {
  days: DayPlan[];
  packId: string;
  checkIns: Record<string, DayCheckIn>;
  maxItems?: number;
}): CatchUpItem[] {
  const max = input.maxItems ?? 5;
  const items: CatchUpItem[] = [];

  for (const d of input.days) {
    const cin = input.checkIns[`${input.packId}:${d.dayIndex}`];
    if (cin?.status === 'skipped') {
      items.push({
        key: `skip-${d.dayIndex}`,
        dayIndex: d.dayIndex,
        dateOffset: d.dateOffset,
        title: d.title,
        reason: '已跳过，可补做',
        kind: 'skipped',
      });
    } else if (cin?.status === 'fail') {
      items.push({
        key: `fail-${d.dayIndex}`,
        dayIndex: d.dayIndex,
        dateOffset: d.dateOffset,
        title: d.title,
        reason: '未通过，建议重做验收',
        kind: 'fail',
      });
    }
  }

  for (const d of input.days) {
    if (!d.gateId) continue;
    const cin = input.checkIns[`${input.packId}:${d.dayIndex}`];
    if (cin?.status === 'pass') continue;
    if (items.some((i) => i.dayIndex === d.dayIndex)) continue;
    items.push({
      key: `gate-${d.dayIndex}`,
      dayIndex: d.dayIndex,
      dateOffset: d.dateOffset,
      title: d.title,
      reason: `临近/待完成门禁 ${d.gateId}`,
      kind: 'gate',
    });
  }

  return items.slice(0, max);
}

/**
 * Whether to show a gentle streak-break recall to switch to minimum mode.
 * @param input.missedLast7 - Missed days in last 7.
 * @param input.mode - Current learning mode.
 * @param input.dismissedOnDate - ISO date when user dismissed (hide same day).
 * @param input.viewDate - Current view date ISO.
 */
export function shouldShowStreakRecall(input: {
  missedLast7: number;
  mode: 'standard' | 'minimum' | 'sprint';
  dismissedOnDate?: string;
  viewDate: string;
}): boolean {
  if (input.mode === 'minimum') return false;
  if (input.dismissedOnDate === input.viewDate) return false;
  return input.missedLast7 >= 2;
}

/**
 * Convenience: missed + streak for Today coaching from raw state slices.
 */
export function computeTodayMissed(input: {
  checkIns: Record<string, DayCheckIn>;
  packId: string;
  days: DayPlan[];
  startDate: string;
  viewDate: string;
}): { missedLast7: number; streakDays: number } {
  return {
    missedLast7: countMissedLast7(
      input.checkIns,
      input.packId,
      input.days,
      input.startDate,
      input.viewDate,
    ),
    streakDays: computeStreak(
      input.checkIns,
      input.packId,
      input.days,
      input.startDate,
      input.viewDate,
    ),
  };
}
