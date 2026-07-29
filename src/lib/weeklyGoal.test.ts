import { describe, expect, it } from 'vitest';
import type { DayCheckIn, DayPlan } from '../types/curriculum';
import {
  countWeeklyPasses,
  defaultWeeklyPassGoal,
  resolveWeeklyPassGoal,
  weeklyGoalEncouragement,
} from './weeklyGoal';

function stubDay(dayIndex: number, dateOffset: number): DayPlan {
  return {
    dayIndex,
    dateOffset,
    phaseId: 'A',
    phaseName: '阶段',
    week: 1,
    title: `Day ${dayIndex}`,
    track: 'main',
    estimatedMinutes: 30,
    content: 'x'.repeat(60),
    path: ['a', 'b', 'c'],
    references: [{ title: 'r', url: 'https://example.com' }],
    acceptanceCriteria: ['c1', 'c2'],
    acceptanceTests: [
      { id: 't1', question: 'q', passHint: 'p' },
      { id: 't2', question: 'q2', passHint: 'p2' },
    ],
    deliverable: 'note',
    minimumMode: true,
  };
}

describe('weeklyGoal', () => {
  it('defaults by person type', () => {
    expect(defaultWeeklyPassGoal('child_primary')).toBe(4);
    expect(defaultWeeklyPassGoal('working_professional')).toBe(5);
  });

  it('resolves and clamps stored goals', () => {
    expect(resolveWeeklyPassGoal(undefined, 'teen_student')).toBe(4);
    expect(resolveWeeklyPassGoal(3, 'working_professional')).toBe(3);
    expect(resolveWeeklyPassGoal(99, 'working_professional')).toBe(14);
  });

  it('counts passes in the ISO week of viewDate', () => {
    // 2026-07-27 is Monday of ISO week 2026-W31
    const startDate = '2026-07-27';
    const days = [0, 1, 2, 3].map((i) => stubDay(i + 1, i));
    const checkIns: Record<string, DayCheckIn> = {
      'pack:1': {
        dayIndex: 1,
        packId: 'pack',
        status: 'pass',
        completedPathSteps: [],
        passedTestIds: [],
        evidence: '',
        typedAnswers: {},
        actualMinutes: 20,
        checkedAt: '2026-07-27T10:00:00.000Z',
        notes: '',
      },
      'pack:2': {
        dayIndex: 2,
        packId: 'pack',
        status: 'partial',
        completedPathSteps: [],
        passedTestIds: [],
        evidence: '',
        typedAnswers: {},
        actualMinutes: 20,
        checkedAt: '2026-07-28T10:00:00.000Z',
        notes: '',
      },
      'pack:3': {
        dayIndex: 3,
        packId: 'pack',
        status: 'pass',
        completedPathSteps: [],
        passedTestIds: [],
        evidence: '',
        typedAnswers: {},
        actualMinutes: 20,
        checkedAt: '2026-07-29T10:00:00.000Z',
        notes: '',
      },
    };
    expect(
      countWeeklyPasses({
        checkIns,
        packId: 'pack',
        days,
        startDate,
        viewDate: '2026-07-29',
      }),
    ).toBe(2);
  });

  it('encourages only when goal met', () => {
    expect(weeklyGoalEncouragement(4, 4)).toMatch(/已达成/);
    expect(weeklyGoalEncouragement(2, 5)).toBe('');
  });
});
