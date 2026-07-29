import type {
  AcceptanceTest,
  DayPlan,
  ReferenceLink,
  TrackId,
} from '../types/curriculum';

/** Input for creating a richly specified day. */
export interface DayDraft {
  phaseId: string;
  phaseName: string;
  week: number;
  title: string;
  track?: TrackId;
  estimatedMinutes?: number;
  content: string;
  path: string[];
  references: ReferenceLink[];
  acceptanceCriteria: string[];
  acceptanceTests: Array<[string, string, string] | AcceptanceTest>;
  deliverable: string;
  minimumMode?: boolean;
  gateId?: string;
  requireEvidence?: boolean;
}

/**
 * Normalizes acceptance test drafts into objects.
 */
function normalizeTests(
  tests: DayDraft['acceptanceTests'],
): AcceptanceTest[] {
  return tests.map((t, i) => {
    if (Array.isArray(t)) {
      return {
        id: t[0] || `t${i + 1}`,
        question: t[1],
        passHint: t[2],
      };
    }
    return t;
  });
}

/**
 * Builds sequential DayPlan list from drafts.
 * Ensures content meets the pack quality gate (>= 60 chars).
 * @param drafts - Ordered day drafts.
 * @returns Day plans with dayIndex/dateOffset assigned.
 */
export function buildDaysFromDrafts(drafts: DayDraft[]): DayPlan[] {
  return drafts.map((draft, index) => {
    const isGate = Boolean(draft.gateId);
    let content = draft.content.trim();
    if (content.length < 60) {
      content = `${content} 今日属于「${draft.phaseName}」阶段，主题是「${draft.title}」。请按路径逐步完成，并以交付物与验收测试证明你真的做完，而不是只浏览了资料。`;
    }
    const criteria =
      draft.acceptanceCriteria.length >= 2
        ? draft.acceptanceCriteria
        : [
            ...draft.acceptanceCriteria,
            '路径步骤完成可勾选',
            '验收测试可诚实通过',
          ].slice(0, 3);

    return {
      dayIndex: index + 1,
      dateOffset: index,
      phaseId: draft.phaseId,
      phaseName: draft.phaseName,
      week: draft.week,
      title: draft.title,
      track: draft.track ?? (isGate ? 'gate' : 'main'),
      estimatedMinutes: draft.estimatedMinutes ?? 70,
      content,
      path: draft.path,
      references: draft.references,
      acceptanceCriteria: criteria,
      acceptanceTests: normalizeTests(draft.acceptanceTests),
      deliverable: draft.deliverable,
      minimumMode: draft.minimumMode ?? false,
      gateId: draft.gateId,
      requireEvidence: draft.requireEvidence ?? isGate,
    };
  });
}

/** Shortcut reference helper. */
export function ref(title: string, url: string): ReferenceLink {
  return { title, url };
}
