import { addDays, weekKey } from './date';
import type { DayCheckIn, DayPlan, PersonTypeId } from '../types/curriculum';

/**
 * Returns a reasonable default weekly Pass goal for a person type.
 * @param personTypeId - Learner audience id.
 * @returns Default goal (4 for younger/senior, 5 otherwise).
 */
export function defaultWeeklyPassGoal(personTypeId: PersonTypeId): number {
  if (
    personTypeId === 'child_primary' ||
    personTypeId === 'teen_student' ||
    personTypeId === 'senior_learner'
  ) {
    return 4;
  }
  return 5;
}

/**
 * Resolves the effective weekly Pass goal from state or person-type default.
 * @param weeklyPassGoal - Optional stored goal.
 * @param personTypeId - Learner audience id.
 * @returns Clamped goal between 1 and 14.
 */
export function resolveWeeklyPassGoal(
  weeklyPassGoal: number | undefined,
  personTypeId: PersonTypeId,
): number {
  const raw =
    typeof weeklyPassGoal === 'number' && Number.isFinite(weeklyPassGoal)
      ? weeklyPassGoal
      : defaultWeeklyPassGoal(personTypeId);
  return Math.max(1, Math.min(14, Math.round(raw)));
}

/**
 * Counts Pass check-ins for the current pack whose mapped calendar day
 * falls in the ISO week of `viewDate`.
 * @param input.checkIns - Persisted check-ins keyed by packId:dayIndex.
 * @param input.packId - Active pack id.
 * @param input.days - Scaled/visible day plans for the pack.
 * @param input.startDate - Program start ISO date.
 * @param input.viewDate - Reference date for the ISO week.
 * @returns Number of Pass days in that week.
 */
export function countWeeklyPasses(input: {
  checkIns: Record<string, DayCheckIn>;
  packId: string;
  days: DayPlan[];
  startDate: string;
  viewDate: string;
}): number {
  const targetWeek = weekKey(input.viewDate);
  let count = 0;
  for (const day of input.days) {
    const iso = addDays(input.startDate, day.dateOffset);
    if (weekKey(iso) !== targetWeek) continue;
    const cin = input.checkIns[`${input.packId}:${day.dayIndex}`];
    if (cin?.status === 'pass' && cin.packId === input.packId) {
      count += 1;
    }
  }
  return count;
}

/**
 * Light encouragement when the weekly goal is met; empty when not met.
 * @param passCount - Passes this week.
 * @param goal - Target Pass count.
 * @returns Encouragement sentence or empty string (never shaming).
 */
export function weeklyGoalEncouragement(passCount: number, goal: number): string {
  if (passCount >= goal) {
    return '本周目标已达成，节奏很稳，继续保持就好。';
  }
  return '';
}
