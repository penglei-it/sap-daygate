import { validatePack } from './acceptance';
import type {
  CurriculumPack,
  DayPlan,
  PackValidationResult,
  PersonTypeId,
  TrackId,
} from '../types/curriculum';

const TRACKS: TrackId[] = [
  'main',
  'side',
  'cert',
  'rest',
  'gate',
  'review',
  'practice',
  'admin',
];

/**
 * Normalizes a raw JSON object into a CurriculumPack with sequential indexes.
 * @param raw - Parsed JSON value.
 * @returns Normalized pack.
 * @throws Error when required top-level fields are missing.
 */
export function normalizePack(raw: unknown): CurriculumPack {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Pack JSON must be an object');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    throw new Error('Pack.id is required');
  }
  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    throw new Error('Pack.title is required');
  }
  if (!Array.isArray(obj.days) || obj.days.length === 0) {
    throw new Error('Pack.days must be a non-empty array');
  }

  const days: DayPlan[] = obj.days.map((item, index) => {
    const d = (item ?? {}) as Record<string, unknown>;
    const track = TRACKS.includes(d.track as TrackId)
      ? (d.track as TrackId)
      : 'main';
    const gateId = typeof d.gateId === 'string' ? d.gateId : undefined;
    const phaseName = String(d.phaseName ?? '阶段');
    const title = String(d.title ?? `Day ${index + 1}`);
    let content = String(d.content ?? '').trim();
    if (content.length < 60) {
      content = `${content} 今日属于「${phaseName}」阶段，主题是「${title}」。请按路径逐步完成，并以交付物与验收测试证明你真的做完，而不是只浏览了资料。`;
    }
    let acceptanceCriteria = Array.isArray(d.acceptanceCriteria)
      ? d.acceptanceCriteria.map(String)
      : [];
    if (acceptanceCriteria.length < 2) {
      acceptanceCriteria = [
        ...acceptanceCriteria,
        '路径步骤完成可勾选',
        '验收测试可诚实通过',
      ].slice(0, 3);
    }
    let path = Array.isArray(d.path) ? d.path.map(String) : [];
    if (path.length < 3) {
      path = [...path, '阅读参考资料', '完成今日交付物', '对照验收标准自检'].slice(
        0,
        Math.max(3, path.length),
      );
    }
    let acceptanceTests = Array.isArray(d.acceptanceTests)
      ? d.acceptanceTests.map((t, i) => {
          const test = (t ?? {}) as Record<string, unknown>;
          return {
            id: String(test.id ?? `t${i + 1}`),
            question: String(test.question ?? '请确认完成'),
            passHint: String(test.passHint ?? '完成即可'),
            requiresTypedAnswer: Boolean(test.requiresTypedAnswer),
          };
        })
      : [];
    if (acceptanceTests.length < 2) {
      acceptanceTests = [
        ...acceptanceTests,
        {
          id: 'auto1',
          question: '今日交付物是否已产出？',
          passHint: '能指出位置',
          requiresTypedAnswer: false,
        },
        {
          id: 'auto2',
          question: '最大卡点是什么？',
          passHint: '有记录或写无',
          requiresTypedAnswer: false,
        },
      ].slice(0, 3);
    }

    return {
      dayIndex: index + 1,
      dateOffset: index,
      phaseId: String(d.phaseId ?? 'A'),
      phaseName,
      week: Number(d.week ?? Math.floor(index / 7) + 1),
      title,
      track: gateId ? 'gate' : track,
      estimatedMinutes: Number(d.estimatedMinutes ?? 40),
      content,
      path,
      references: Array.isArray(d.references)
        ? d.references.map((r) => {
            const ref = (r ?? {}) as Record<string, unknown>;
            return {
              title: String(ref.title ?? '参考'),
              url: String(ref.url ?? 'https://example.com'),
            };
          })
        : [{ title: '参考', url: 'https://example.com' }],
      acceptanceCriteria,
      acceptanceTests,
      deliverable: String(d.deliverable ?? '学习笔记'),
      minimumMode: Boolean(d.minimumMode),
      gateId,
      requireEvidence: Boolean(d.requireEvidence ?? gateId),
    };
  });

  const supportedPersonTypes = Array.isArray(obj.supportedPersonTypes)
    ? (obj.supportedPersonTypes as PersonTypeId[])
    : (['working_professional'] as PersonTypeId[]);

  return {
    id: obj.id.trim(),
    version: String(obj.version ?? '1.0.0'),
    title: obj.title.trim(),
    subtitle: String(obj.subtitle ?? ''),
    category:
      obj.category === 'exam' || obj.category === 'task' || obj.category === 'skill'
        ? obj.category
        : 'skill',
    locale: obj.locale === 'en' ? 'en' : 'zh-CN',
    supportedPersonTypes,
    summary: String(obj.summary ?? obj.title),
    phases: Array.isArray(obj.phases)
      ? (obj.phases as CurriculumPack['phases'])
      : [{ id: 'A', name: '默认阶段', goal: '完成日课' }],
    days,
    optionFields: Array.isArray(obj.optionFields)
      ? (obj.optionFields as CurriculumPack['optionFields'])
      : undefined,
    optionalTracks: Array.isArray(obj.optionalTracks)
      ? (obj.optionalTracks as TrackId[])
      : undefined,
  };
}

export interface ImportPackResult {
  pack?: CurriculumPack;
  validation: PackValidationResult;
  error?: string;
}

/**
 * Parses pack JSON text, normalizes, and validates quality gate.
 * @param text - Raw JSON string.
 * @returns Import result with pack when valid.
 */
export function importPackFromJson(text: string): ImportPackResult {
  try {
    const parsed = JSON.parse(text) as unknown;
    const pack = normalizePack(parsed);
    const validation = validatePack(pack);
    if (!validation.ok) {
      return { validation, error: 'Pack failed quality validation' };
    }
    return { pack, validation };
  } catch (err) {
    return {
      validation: {
        ok: false,
        packId: 'unknown',
        issues: [
          {
            level: 'error',
            message: err instanceof Error ? err.message : 'Invalid JSON',
          },
        ],
      },
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}
