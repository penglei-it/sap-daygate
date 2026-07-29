import { describe, expect, it } from 'vitest';
import { importPackFromJson } from './packImport';
import { buildSoftReminder, computeStreak } from './guardian';
import samplePack from '../../public/examples/sample-custom-pack.json';

describe('pack hot import', () => {
  it('imports and validates sample custom pack', () => {
    const result = importPackFromJson(JSON.stringify(samplePack));
    expect(result.error).toBeUndefined();
    expect(result.pack?.id).toBe('custom-morning-english');
    expect(result.validation.ok).toBe(true);
    expect(result.pack?.days.length).toBeGreaterThanOrEqual(14);
  });

  it('rejects invalid json', () => {
    const result = importPackFromJson('{bad');
    expect(result.pack).toBeUndefined();
    expect(result.validation.ok).toBe(false);
  });
});

describe('guardian helpers', () => {
  it('builds softer reminder when streak is healthy', () => {
    const msg = buildSoftReminder({
      missedLast7: 0,
      streakDays: 4,
      todayStatus: 'pending',
    });
    expect(msg.includes('连续') || msg.includes('今天')).toBe(true);
  });

  it('computes streak from recent pass days', () => {
    const days = [
      {
        dayIndex: 1,
        dateOffset: 0,
        phaseId: 'A',
        phaseName: 'A',
        week: 1,
        title: 'd1',
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
      },
      {
        dayIndex: 2,
        dateOffset: 1,
        phaseId: 'A',
        phaseName: 'A',
        week: 1,
        title: 'd2',
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
      },
    ];
    const streak = computeStreak(
      {
        'p:1': {
          dayIndex: 1,
          packId: 'p',
          status: 'pass',
          completedPathSteps: [0, 1, 2],
          passedTestIds: ['1', '2'],
          evidence: 'ok',
          typedAnswers: {},
          actualMinutes: 20,
          checkedAt: new Date().toISOString(),
          notes: '',
        },
        'p:2': {
          dayIndex: 2,
          packId: 'p',
          status: 'partial',
          completedPathSteps: [0],
          passedTestIds: ['1'],
          evidence: '',
          typedAnswers: {},
          actualMinutes: 10,
          checkedAt: new Date().toISOString(),
          notes: '',
        },
      },
      'p',
      days,
      '2026-08-01',
      '2026-08-02',
    );
    expect(streak).toBeGreaterThanOrEqual(1);
  });
});
