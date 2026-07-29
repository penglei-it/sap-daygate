import { describe, expect, it } from 'vitest';
import {
  evaluateAcceptance,
  listAcceptanceGaps,
  scaleMinutes,
  statusLabel,
  validatePack,
  filterDays,
} from './acceptance';
import { PACKS } from '../packs';

describe('acceptance engine', () => {
  it('fails gate without evidence', () => {
    const status = evaluateAcceptance({
      allTests: [{ id: 'a', question: 'q', passHint: 'h' }],
      passedTestIds: ['a'],
      pathTotal: 3,
      pathDone: 3,
      evidence: '',
      typedAnswers: {},
      requireEvidence: true,
      isGate: true,
    });
    expect(status).toBe('partial');
  });

  it('rejects weak repeated evidence on gate', () => {
    const status = evaluateAcceptance({
      allTests: [{ id: 'a', question: 'q', passHint: 'h' }],
      passedTestIds: ['a'],
      pathTotal: 1,
      pathDone: 1,
      evidence: 'aaaaaaaaaaaa',
      typedAnswers: {},
      requireEvidence: true,
      isGate: true,
    });
    expect(status).toBe('partial');
  });

  it('passes when tests, path, typed answer and evidence ok', () => {
    const status = evaluateAcceptance({
      allTests: [
        { id: 'a', question: 'q', passHint: 'h' },
        {
          id: 'b',
          question: 'type',
          passHint: 'h',
          requiresTypedAnswer: true,
        },
      ],
      passedTestIds: ['a', 'b'],
      pathTotal: 4,
      pathDone: 4,
      evidence: 'notes/path-demo.md',
      typedAnswers: { b: 'hello world' },
      requireEvidence: true,
      isGate: true,
    });
    expect(status).toBe('pass');
  });

  it('lists concrete Chinese gaps for coaching', () => {
    const gaps = listAcceptanceGaps({
      allTests: [
        { id: 'a', question: 'q', passHint: 'h' },
        {
          id: 'b',
          question: 'type',
          passHint: 'h',
          requiresTypedAnswer: true,
        },
      ],
      passedTestIds: ['a'],
      pathTotal: 5,
      pathDone: 2,
      evidence: 'aa',
      typedAnswers: { b: '' },
      requireEvidence: true,
      isGate: true,
    });
    const ids = gaps.map((g) => g.id);
    expect(ids).toContain('tests');
    expect(ids).toContain('path');
    expect(ids).toContain('typed');
    expect(ids).toContain('evidence-short');
    expect(gaps.every((g) => g.message.length > 0)).toBe(true);
  });

  it('maps status to Chinese labels', () => {
    expect(statusLabel('pass')).toBe('通过');
    expect(statusLabel('skipped')).toBe('已跳过');
  });

  it('scales minutes into budget band', () => {
    expect(scaleMinutes(70, 0.55, 35)).toBeGreaterThanOrEqual(15);
    expect(scaleMinutes(70, 1.2, 110)).toBeLessThanOrEqual(Math.round(110 * 1.35));
  });

  it('filters cert track and minimum mode', () => {
    const days = PACKS[0].days;
    const noCert = filterDays(days, { mode: 'standard', disabledTracks: ['cert'] });
    expect(noCert.every((d) => d.track !== 'cert')).toBe(true);
    const min = filterDays(days, { mode: 'minimum', disabledTracks: [] });
    expect(min.every((d) => d.minimumMode || d.track === 'gate')).toBe(true);
  });
});

describe('pack quality gate', () => {
  it('all built-in packs pass validatePack', () => {
    for (const pack of PACKS) {
      const result = validatePack(pack);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(pack.id, result.issues.filter((i) => i.level === 'error'));
      }
      expect(result.ok).toBe(true);
    }
  });

  it('every person type has at least one pack', () => {
    const types = new Set(PACKS.flatMap((p) => p.supportedPersonTypes));
    expect(types.has('working_professional')).toBe(true);
    expect(types.has('child_primary')).toBe(true);
    expect(types.has('exam_sprinter')).toBe(true);
    expect(types.has('senior_learner')).toBe(true);
  });
});
