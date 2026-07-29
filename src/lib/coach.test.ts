import { describe, expect, it } from 'vitest';
import {
  buildCatchUpQueue,
  shouldShowStreakRecall,
} from './coach';
import type { DayCheckIn, DayPlan } from '../types/curriculum';

function day(partial: Partial<DayPlan> & { dayIndex: number }): DayPlan {
  return {
    dateOffset: partial.dayIndex - 1,
    phaseId: 'A',
    phaseName: '阶段',
    week: 1,
    title: partial.title ?? `Day ${partial.dayIndex}`,
    track: partial.gateId ? 'gate' : 'main',
    estimatedMinutes: 30,
    content: 'x'.repeat(60),
    path: ['a', 'b', 'c'],
    references: [{ title: 'r', url: 'https://example.com' }],
    acceptanceCriteria: ['a', 'b'],
    acceptanceTests: [
      { id: '1', question: 'q', passHint: 'h' },
      { id: '2', question: 'q', passHint: 'h' },
    ],
    deliverable: 'd',
    minimumMode: false,
    ...partial,
  };
}

describe('coach', () => {
  it('queues skipped and fail before upcoming gates', () => {
    const days = [
      day({ dayIndex: 1, title: '跳过日' }),
      day({ dayIndex: 2, title: '失败日' }),
      day({ dayIndex: 3, title: '门禁', gateId: 'G1', requireEvidence: true }),
    ];
    const checkIns: Record<string, DayCheckIn> = {
      'p:1': {
        dayIndex: 1,
        packId: 'p',
        status: 'skipped',
        completedPathSteps: [],
        passedTestIds: [],
        evidence: '',
        typedAnswers: {},
        actualMinutes: 0,
        checkedAt: '',
        notes: '',
        skipReason: '出差',
      },
      'p:2': {
        dayIndex: 2,
        packId: 'p',
        status: 'fail',
        completedPathSteps: [],
        passedTestIds: [],
        evidence: '',
        typedAnswers: {},
        actualMinutes: 0,
        checkedAt: '',
        notes: '',
      },
    };
    const queue = buildCatchUpQueue({ days, packId: 'p', checkIns, maxItems: 5 });
    expect(queue.map((q) => q.kind)).toEqual(['skipped', 'fail', 'gate']);
  });

  it('labels due gates vs future gates by currentOffset', () => {
    const days = [
      day({ dayIndex: 1, gateId: 'G-due', dateOffset: 0 }),
      day({ dayIndex: 5, gateId: 'G-later', dateOffset: 4 }),
    ];
    const due = buildCatchUpQueue({
      days,
      packId: 'p',
      checkIns: {},
      currentOffset: 1,
      maxItems: 5,
    });
    expect(due.find((q) => q.dayIndex === 1)?.reason).toContain('待完成门禁');
    expect(due.find((q) => q.dayIndex === 5)?.reason).toContain('后续门禁');
  });

  it('shows streak recall when missed and not on minimum', () => {
    expect(
      shouldShowStreakRecall({
        missedLast7: 2,
        mode: 'standard',
        viewDate: '2026-07-29',
      }),
    ).toBe(true);
    expect(
      shouldShowStreakRecall({
        missedLast7: 2,
        mode: 'minimum',
        viewDate: '2026-07-29',
      }),
    ).toBe(false);
    expect(
      shouldShowStreakRecall({
        missedLast7: 2,
        mode: 'standard',
        dismissedOnDate: '2026-07-29',
        viewDate: '2026-07-29',
      }),
    ).toBe(false);
  });
});
