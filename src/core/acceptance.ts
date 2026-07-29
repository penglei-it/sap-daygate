import type {
  AcceptanceTest,
  DayPlan,
  PackValidationIssue,
  PackValidationResult,
  CurriculumPack,
} from '../types/curriculum';

export interface AcceptanceInput {
  allTests: AcceptanceTest[];
  passedTestIds: string[];
  pathTotal: number;
  pathDone: number;
  evidence: string;
  typedAnswers: Record<string, string>;
  requireEvidence: boolean;
  /** Gate days use a stricter evidence quality bar. */
  isGate?: boolean;
  forceSkip?: boolean;
}

/** One human-readable gap blocking a full Pass. */
export interface AcceptanceGap {
  /** Stable machine id for tests / analytics. */
  id: string;
  /** Chinese message shown in the task UI. */
  message: string;
}

/**
 * Minimum evidence length for the current day type.
 * @param isGate - Whether this day is a milestone gate.
 */
export function evidenceMinLength(isGate?: boolean): number {
  return isGate ? 12 : 8;
}

/**
 * Checks evidence quality against length / repetition / character rules.
 * @param evidence - Raw evidence text.
 * @param isGate - Gate days require a longer minimum.
 * @returns True when evidence meets the quality bar.
 */
export function isEvidenceQualityOk(evidence: string, isGate?: boolean): boolean {
  const evidenceText = (evidence ?? '').trim();
  const minLen = evidenceMinLength(isGate);
  return (
    evidenceText.length >= minLen &&
    !/^(.)\1+$/u.test(evidenceText) &&
    /[\p{L}\p{N}]/u.test(evidenceText)
  );
}

/**
 * Lists concrete gaps that prevent Pass (empty when ready to pass).
 * Used for live coaching and post-submit explanation.
 * @param input - Same payload as evaluateAcceptance (ignore forceSkip).
 * @returns Ordered gap list in Chinese.
 */
export function listAcceptanceGaps(input: AcceptanceInput): AcceptanceGap[] {
  const gaps: AcceptanceGap[] = [];
  const allIds = input.allTests.map((t) => t.id);
  const passCount = allIds.filter((id) => input.passedTestIds.includes(id)).length;
  const pathNeed =
    input.pathTotal === 0 ? 0 : Math.ceil(input.pathTotal * 0.8);
  const pathOk = input.pathTotal === 0 || input.pathDone >= pathNeed;

  if (allIds.length > 0 && passCount < allIds.length) {
    gaps.push({
      id: 'tests',
      message: `验收测试未勾全：已勾 ${passCount}/${allIds.length} 项`,
    });
  }

  if (!pathOk) {
    gaps.push({
      id: 'path',
      message: `学习路径未达 80%：已完成 ${input.pathDone}/${input.pathTotal} 步（至少 ${pathNeed} 步）`,
    });
  }

  const typedRequired = input.allTests.filter((t) => t.requiresTypedAnswer);
  const typedMissing = typedRequired.filter((t) => {
    const ans = (input.typedAnswers[t.id] ?? '').trim();
    return ans.length < 2;
  });
  if (typedMissing.length > 0) {
    gaps.push({
      id: 'typed',
      message: `打字题未作答或过短：还有 ${typedMissing.length} 题需至少 2 个字符`,
    });
  }

  if (input.requireEvidence) {
    const text = (input.evidence ?? '').trim();
    const minLen = evidenceMinLength(input.isGate);
    if (!text) {
      gaps.push({
        id: 'evidence-empty',
        message: `需填写成果证据（${input.isGate ? '门禁日' : '本日'}至少 ${minLen} 字）`,
      });
    } else if (text.length < minLen) {
      gaps.push({
        id: 'evidence-short',
        message: `证据过短：当前 ${text.length} 字，至少需要 ${minLen} 字`,
      });
    } else if (/^(.)\1+$/u.test(text)) {
      gaps.push({
        id: 'evidence-repeat',
        message: '证据不能是同一字符重复（如 aaaa…）',
      });
    } else if (!/[\p{L}\p{N}]/u.test(text)) {
      gaps.push({
        id: 'evidence-charset',
        message: '证据需包含字母或数字（不要只有符号/空格）',
      });
    }
  }

  return gaps;
}

/**
 * Evaluates a day check-in.
 * Gate/evidence days fail closed when evidence is weak/empty.
 * @param input - Acceptance payload; forceSkip yields skipped.
 * @returns Status for persistence. Success: pass/skipped; soft miss: partial; empty: fail.
 */
export function evaluateAcceptance(
  input: AcceptanceInput,
): 'pass' | 'partial' | 'fail' | 'skipped' {
  if (input.forceSkip) return 'skipped';

  const gaps = listAcceptanceGaps(input);
  if (gaps.length === 0) {
    return 'pass';
  }

  const passCount = input.allTests.filter((t) =>
    input.passedTestIds.includes(t.id),
  ).length;
  if (passCount > 0 || input.pathDone > 0 || (input.evidence ?? '').trim()) {
    return 'partial';
  }

  return 'fail';
}

/**
 * Maps persisted status codes to Chinese UI labels.
 * @param status - Check-in status or pending placeholder.
 */
export function statusLabel(
  status: 'pass' | 'partial' | 'fail' | 'skipped' | 'pending' | string,
): string {
  switch (status) {
    case 'pass':
      return '通过';
    case 'partial':
      return '部分完成';
    case 'fail':
      return '未通过';
    case 'skipped':
      return '已跳过';
    case 'pending':
      return '待完成';
    default:
      return status;
  }
}

/**
 * Validates pack quality for release acceptance.
 * @param pack - Curriculum pack.
 * @returns Validation result with errors/warnings.
 */
export function validatePack(pack: CurriculumPack): PackValidationResult {
  const issues: PackValidationIssue[] = [];

  if (!pack.id || !pack.title) {
    issues.push({ level: 'error', message: 'Pack missing id/title' });
  }
  if (!pack.days?.length) {
    issues.push({ level: 'error', message: 'Pack has no days' });
  }
  if (pack.days.length < 14) {
    issues.push({
      level: 'error',
      message: `Pack ${pack.id} must have at least 14 days (has ${pack.days.length})`,
    });
  }
  if (!pack.supportedPersonTypes?.length) {
    issues.push({ level: 'error', message: 'Pack must declare supportedPersonTypes' });
  }

  const titles = new Set<string>();
  let gateCount = 0;

  for (const day of pack.days) {
    if (titles.has(day.title)) {
      issues.push({
        level: 'warning',
        dayIndex: day.dayIndex,
        message: `Duplicate title: ${day.title}`,
      });
    }
    titles.add(day.title);

    if (!day.content || day.content.trim().length < 60) {
      issues.push({
        level: 'error',
        dayIndex: day.dayIndex,
        message: 'content must be >= 60 chars',
      });
    }
    if (!day.path || day.path.length < 3) {
      issues.push({
        level: 'error',
        dayIndex: day.dayIndex,
        message: 'path must have >= 3 steps',
      });
    }
    if (!day.references?.length) {
      issues.push({
        level: 'error',
        dayIndex: day.dayIndex,
        message: 'references required',
      });
    }
    if (!day.acceptanceCriteria || day.acceptanceCriteria.length < 2) {
      issues.push({
        level: 'error',
        dayIndex: day.dayIndex,
        message: 'acceptanceCriteria >= 2 required',
      });
    }
    if (!day.acceptanceTests || day.acceptanceTests.length < 2) {
      issues.push({
        level: 'error',
        dayIndex: day.dayIndex,
        message: 'acceptanceTests >= 2 required',
      });
    }
    if (!day.deliverable?.trim()) {
      issues.push({
        level: 'error',
        dayIndex: day.dayIndex,
        message: 'deliverable required',
      });
    }
    if (day.gateId) {
      gateCount += 1;
      if (!day.requireEvidence) {
        issues.push({
          level: 'error',
          dayIndex: day.dayIndex,
          message: 'gate days must set requireEvidence=true',
        });
      }
    }
  }

  if (gateCount < 1) {
    issues.push({ level: 'error', message: 'Pack must include at least 1 gate day' });
  }

  const ok = !issues.some((i) => i.level === 'error');
  return { ok, packId: pack.id, issues };
}

/**
 * Scales minutes by person type multiplier and clamps to budget.
 * @param baseMinutes - Pack baseline minutes.
 * @param multiplier - Person type multiplier.
 * @param budget - Soft daily budget.
 */
export function scaleMinutes(
  baseMinutes: number,
  multiplier: number,
  budget: number,
): number {
  const scaled = Math.round(baseMinutes * multiplier);
  return Math.max(15, Math.min(scaled, Math.round(budget * 1.35)));
}

/**
 * Filters days by mode and disabled tracks.
 */
export function filterDays(
  days: DayPlan[],
  opts: {
    mode: 'standard' | 'minimum' | 'sprint';
    disabledTracks: string[];
  },
): DayPlan[] {
  return days.filter((d) => {
    if (opts.disabledTracks.includes(d.track)) return false;
    if (opts.mode === 'minimum' && !d.minimumMode && d.track !== 'gate') {
      return false;
    }
    if (opts.mode === 'sprint' && d.track === 'side') return false;
    return true;
  });
}

/**
 * Applies person-type minute scaling to a day copy.
 */
export function applyPersonScaling(
  day: DayPlan,
  multiplier: number,
  budget: number,
): DayPlan {
  return {
    ...day,
    estimatedMinutes: scaleMinutes(day.estimatedMinutes, multiplier, budget),
  };
}
