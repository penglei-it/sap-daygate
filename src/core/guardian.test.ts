import { describe, expect, it } from 'vitest';
import {
  buildSoftReminder,
  countMissedLast7,
  computeStreak,
} from './guardian';

describe('guardian soft reminder', () => {
  it('praises completed today', () => {
    const msg = buildSoftReminder({
      missedLast7: 1,
      streakDays: 1,
      todayStatus: 'pass',
    });
    expect(msg.includes('表扬') || msg.includes('完成')).toBe(true);
  });

  it('suggests minimum mode after misses', () => {
    const msg = buildSoftReminder({
      missedLast7: 4,
      streakDays: 0,
      todayStatus: 'pending',
    });
    expect(msg.includes('保底')).toBe(true);
  });
});

describe('guardian streak helpers', () => {
  const day = (index: number, offset: number) => ({
    dayIndex: index,
    dateOffset: offset,
    phaseId: 'A',
    phaseName: 'A',
    week: 1,
    title: `d${index}`,
    track: 'main' as const,
    estimatedMinutes: 20,
    content: 'x'.repeat(70),
    path: ['a', 'b', 'c'],
    references: [{ title: 't', url: 'https://example.com' }],
    acceptanceCriteria: ['a', 'b'],
    acceptanceTests: [
      { id: '1', question: 'q', passHint: 'h' },
      { id: '2', question: 'q', passHint: 'h' },
    ],
    deliverable: 'd',
    minimumMode: true,
  });

  it('counts missed days in last 7', () => {
    const days = [day(1, 0), day(2, 1), day(3, 2)];
    const missed = countMissedLast7(
      {
        'p:1': {
          dayIndex: 1,
          packId: 'p',
          status: 'pass',
          completedPathSteps: [],
          passedTestIds: [],
          evidence: 'okxx',
          typedAnswers: {},
          actualMinutes: 10,
          checkedAt: new Date().toISOString(),
          notes: '',
        },
      },
      'p',
      days,
      '2026-08-01',
      '2026-08-03',
    );
    expect(missed).toBeGreaterThanOrEqual(1);
  });

  it('computeStreak returns zero without checkins', () => {
    expect(
      computeStreak({}, 'p', [day(1, 0)], '2026-08-01', '2026-08-01'),
    ).toBe(0);
  });
});
