import { formatISODate, parseISODate } from '../lib/date';
import type { DayCheckIn, DayPlan, UserState } from '../types/curriculum';

export interface GuardianSummary {
  learnerName: string;
  packTitle: string;
  passCount: number;
  partialCount: number;
  failCount: number;
  totalDays: number;
  completionRate: number;
  streakDays: number;
  missedLast7: number;
  todayTitle: string | null;
  todayStatus: DayCheckIn['status'] | 'pending' | 'none';
  softReminder: string;
}

/**
 * Builds soft, non-punitive reminder copy for guardians.
 */
export function buildSoftReminder(input: {
  missedLast7: number;
  streakDays: number;
  todayStatus: GuardianSummary['todayStatus'];
}): string {
  if (input.todayStatus === 'pass') {
    return '今天已经完成验收，可以给一句具体表扬（表扬行为，不只夸“真棒”）。';
  }
  if (input.missedLast7 >= 3) {
    return '最近 7 天有些中断。建议一起把今天改成「保底 15 分钟」，先把链条接上。';
  }
  if (input.streakDays >= 3) {
    return `已连续 ${input.streakDays} 天有进展，保持节奏比加量更重要。`;
  }
  if (input.todayStatus === 'pending' || input.todayStatus === 'none') {
    return '今天还没验收。可陪伴开始前 10 分钟，然后让学习者自己完成打卡。';
  }
  return '进度有波动很正常。关注「是否开始」比关注「是否完美」更有用。';
}

/**
 * Computes consecutive pass/partial days ending at viewDate.
 */
export function computeStreak(
  checkIns: Record<string, DayCheckIn>,
  packId: string,
  days: DayPlan[],
  startDate: string,
  viewDate: string,
): number {
  const byOffset = new Map(days.map((d) => [d.dateOffset, d]));
  let streak = 0;
  const view = parseISODate(viewDate);
  for (let i = 0; i < 60; i += 1) {
    const dt = new Date(view);
    dt.setDate(view.getDate() - i);
    const iso = formatISODate(dt);
    const offset =
      Math.round(
        (parseISODate(iso).getTime() - parseISODate(startDate).getTime()) /
          86_400_000,
      );
    const day = byOffset.get(offset);
    if (!day) break;
    const cin = checkIns[`${packId}:${day.dayIndex}`];
    if (cin && (cin.status === 'pass' || cin.status === 'partial')) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Counts days in last 7 calendar days with no pass/partial.
 */
export function countMissedLast7(
  checkIns: Record<string, DayCheckIn>,
  packId: string,
  days: DayPlan[],
  startDate: string,
  viewDate: string,
): number {
  const byOffset = new Map(days.map((d) => [d.dateOffset, d]));
  let missed = 0;
  const view = parseISODate(viewDate);
  for (let i = 0; i < 7; i += 1) {
    const dt = new Date(view);
    dt.setDate(view.getDate() - i);
    const iso = formatISODate(dt);
    const offset =
      Math.round(
        (parseISODate(iso).getTime() - parseISODate(startDate).getTime()) /
          86_400_000,
      );
    const day = byOffset.get(offset);
    if (!day) continue;
    const cin = checkIns[`${packId}:${day.dayIndex}`];
    if (!cin || cin.status === 'fail' || cin.status === 'skipped') {
      missed += 1;
    }
  }
  return missed;
}

/**
 * Builds guardian dashboard summary.
 */
export function buildGuardianSummary(input: {
  state: UserState;
  packTitle: string;
  days: DayPlan[];
  viewDate: string;
  todayPlan: DayPlan | null;
  getCheckIn: (dayIndex: number) => DayCheckIn | undefined;
}): GuardianSummary {
  const values = Object.values(input.state.checkIns).filter(
    (c) => c.packId === input.state.packId,
  );
  const passCount = values.filter((c) => c.status === 'pass').length;
  const partialCount = values.filter((c) => c.status === 'partial').length;
  const failCount = values.filter((c) => c.status === 'fail').length;
  const totalDays = input.days.length;
  const completionRate =
    totalDays === 0 ? 0 : Math.round((passCount / totalDays) * 100);

  const streakDays = computeStreak(
    input.state.checkIns,
    input.state.packId,
    input.days,
    input.state.startDate,
    input.viewDate,
  );
  const missedLast7 = countMissedLast7(
    input.state.checkIns,
    input.state.packId,
    input.days,
    input.state.startDate,
    input.viewDate,
  );

  const todayStatus = input.todayPlan
    ? input.getCheckIn(input.todayPlan.dayIndex)?.status ?? 'pending'
    : 'none';

  return {
    learnerName: input.state.displayName,
    packTitle: input.packTitle,
    passCount,
    partialCount,
    failCount,
    totalDays,
    completionRate,
    streakDays,
    missedLast7,
    todayTitle: input.todayPlan?.title ?? null,
    todayStatus,
    softReminder: buildSoftReminder({ missedLast7, streakDays, todayStatus }),
  };
}
