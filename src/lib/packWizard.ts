import { validatePack } from '../core/acceptance';
import type {
  CurriculumPack,
  DayPlan,
  PackValidationResult,
  PersonTypeId,
} from '../types/curriculum';

/** Input for the lightweight pack skeleton wizard. */
export interface PackWizardInput {
  /** Pack display title. */
  title: string;
  /** Number of days (14–21). */
  dayCount: number;
  /**
   * Title template; use `{n}` for 1-based day number.
   * Example: `第{n}天：完成今日小目标`
   */
  titleTemplate: string;
  /** When true, places two gate days near mid and end. */
  includeTwoGates: boolean;
  /** Optional pack id slug; auto-generated when omitted. */
  id?: string;
}

const ALL_PERSON_TYPES: PersonTypeId[] = [
  'child_primary',
  'teen_student',
  'college_student',
  'working_professional',
  'career_switcher',
  'senior_learner',
  'exam_sprinter',
];

/**
 * Slugifies a title into a safe pack id fragment.
 * @param title - Human title.
 * @returns Lowercase slug with hyphens.
 */
export function slugifyPackId(title: string): string {
  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const stamp = Date.now().toString(36).slice(-4);
  return `wizard-${ascii || 'pack'}-${stamp}`;
}

/**
 * Builds one day skeleton that satisfies validatePack field minima.
 * @param index0 - Zero-based day index.
 * @param title - Day title (must be unique across the pack).
 * @param opts.gateId - Optional gate id for milestone days.
 * @param opts.phaseId - Phase letter.
 * @param opts.phaseName - Phase display name.
 * @returns A DayPlan ready for validatePack.
 */
function buildDay(
  index0: number,
  title: string,
  opts: {
    gateId?: string;
    phaseId: string;
    phaseName: string;
  },
): DayPlan {
  const n = index0 + 1;
  const content =
    `这是向导生成的第 ${n} 课「${title}」。请把内容改成你的主题，` +
    `保持路径可勾选、交付物可核对。导入后可在设置里导出再细改。` +
    `骨架用于快速起步，不是最终课表正文。`;
  return {
    dayIndex: n,
    dateOffset: index0,
    phaseId: opts.phaseId,
    phaseName: opts.phaseName,
    week: Math.floor(index0 / 7) + 1,
    title,
    track: opts.gateId ? 'gate' : 'main',
    estimatedMinutes: 30,
    content,
    path: ['打开今日材料', '完成核心步骤', '自检交付物', '勾选验收'],
    references: [{ title: '示例参考', url: 'https://example.com' }],
    acceptanceCriteria: ['路径可勾选完成', '交付物可描述'],
    acceptanceTests: [
      {
        id: `t${n}a`,
        question: '今天做完了吗？',
        passHint: '是',
      },
      {
        id: `t${n}b`,
        question: '交付物是什么？',
        passHint: '一句话',
        requiresTypedAnswer: true,
      },
    ],
    deliverable: '今日笔记或作品说明',
    minimumMode: true,
    gateId: opts.gateId,
    requireEvidence: opts.gateId ? true : undefined,
  };
}

/**
 * Generates a CurriculumPack skeleton from wizard fields and validates it.
 * Success: returns pack + validation. Failure: pack may be null when invalid input.
 * @param input - Wizard form values.
 * @returns Pack (when structurally buildable), JSON string, and validation result.
 */
export function generatePackSkeleton(input: PackWizardInput): {
  pack: CurriculumPack | null;
  json: string;
  validation: PackValidationResult;
} {
  const title = input.title.trim();
  const dayCount = Math.round(input.dayCount);
  const template = (input.titleTemplate.trim() || '第{n}天：完成今日小目标').replace(
    /\{n\}/g,
    '{n}',
  );

  if (!title) {
    return {
      pack: null,
      json: '',
      validation: {
        ok: false,
        packId: '',
        issues: [{ level: 'error', message: 'title is required' }],
      },
    };
  }
  if (dayCount < 14 || dayCount > 21) {
    return {
      pack: null,
      json: '',
      validation: {
        ok: false,
        packId: '',
        issues: [
          {
            level: 'error',
            message: 'dayCount must be between 14 and 21',
          },
        ],
      },
    };
  }

  const gateOffsets = input.includeTwoGates
    ? [Math.max(6, Math.floor(dayCount / 2) - 1), dayCount - 1]
    : [dayCount - 1];
  const uniqueGates = [...new Set(gateOffsets)];

  const mid = Math.floor(dayCount / 2);
  const days: DayPlan[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const phaseId = i < mid ? 'A' : 'B';
    const phaseName = i < mid ? '启动周' : '巩固周';
    const gateSlot = uniqueGates.indexOf(i);
    const gateId =
      gateSlot >= 0
        ? `WIZ-G${gateSlot + 1}`
        : undefined;
    const dayTitle = template.replace(/\{n\}/g, String(i + 1));
    days.push(
      buildDay(i, dayTitle, {
        gateId,
        phaseId,
        phaseName,
      }),
    );
  }

  const pack: CurriculumPack = {
    id: input.id?.trim() || slugifyPackId(title),
    version: '1.0.0',
    title,
    subtitle: '向导生成的课表骨架',
    category: 'task',
    locale: 'zh-CN',
    supportedPersonTypes: [...ALL_PERSON_TYPES],
    summary: `由向导生成的 ${dayCount} 天骨架，可导入后自行改写正文。`,
    phases: [
      {
        id: 'A',
        name: '启动周',
        goal: '建立每日节奏',
        gateId: days.find((d) => d.phaseId === 'A' && d.gateId)?.gateId,
      },
      {
        id: 'B',
        name: '巩固周',
        goal: '完成巩固与门禁',
        gateId: days.find((d) => d.phaseId === 'B' && d.gateId)?.gateId,
      },
    ],
    days,
  };

  const validation = validatePack(pack);
  return {
    pack: validation.ok ? pack : pack,
    json: JSON.stringify(pack, null, 2),
    validation,
  };
}
