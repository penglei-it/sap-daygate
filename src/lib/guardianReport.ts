import { addDays } from './date';
import { statusLabel } from '../core/acceptance';
import type { GuardianSummary } from '../core/guardian';
import type { DayCheckIn, DayPlan } from '../types/curriculum';

/**
 * One calendar cell used when building the weekly text report.
 */
export interface GuardianWeekCell {
  /** ISO date YYYY-MM-DD. */
  iso: string;
  /** Day title or placeholder. */
  title: string;
  /** Check-in status when present. */
  status?: DayCheckIn['status'];
}

/**
 * Builds a plain-text weekly summary for clipboard / .txt download.
 * Offline-only; no cloud upload.
 * @param input.summary - Guardian dashboard summary.
 * @param input.weekCells - Last 7 calendar days (oldest → newest).
 * @param input.generatedAt - Optional ISO timestamp for the footer.
 * @returns Multiline Chinese plain text.
 */
export function buildGuardianWeeklyReportText(input: {
  summary: GuardianSummary;
  weekCells: GuardianWeekCell[];
  generatedAt?: string;
}): string {
  const s = input.summary;
  const lines: string[] = [
    '日验 DayGate · 监护周报（近 7 日）',
    '--------------------------------',
    `学习者：${s.learnerName}`,
    `课程包：${s.packTitle}`,
    `通过数：${s.passCount} / ${s.totalDays}（完成率 ${s.completionRate}%）`,
    `近 7 日中断：${s.missedLast7} 天`,
    `连续进展：${s.streakDays} 天`,
    `今日任务：${s.todayTitle ?? '不在课表映射内'}`,
    `今日状态：${statusLabel(s.todayStatus)}`,
    `软提醒：${s.softReminder}`,
    '',
    '近 7 日明细：',
  ];
  for (const cell of input.weekCells) {
    const status = cell.status ? statusLabel(cell.status) : '无打卡';
    lines.push(`- ${cell.iso} · ${cell.title} · ${status}`);
  }
  lines.push('');
  lines.push(
    `生成时间：${input.generatedAt ?? new Date().toISOString()}`,
  );
  lines.push('（本报告仅在本机生成，不会上传）');
  return lines.join('\n');
}

/**
 * Builds the last 7 calendar day cells for the guardian week strip.
 * @param input.viewDate - End date of the window (inclusive).
 * @param input.startDate - Program start date.
 * @param input.days - Pack day plans.
 * @param input.getCheckIn - Lookup by dayIndex.
 * @returns Seven cells from oldest to newest.
 */
export function buildGuardianWeekCells(input: {
  viewDate: string;
  startDate: string;
  days: DayPlan[];
  getCheckIn: (dayIndex: number) => DayCheckIn | undefined;
}): GuardianWeekCell[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(input.viewDate, i - 6);
    const offset = Math.round(
      (new Date(iso + 'T00:00:00').getTime() -
        new Date(input.startDate + 'T00:00:00').getTime()) /
        86_400_000,
    );
    const day = input.days.find((d) => d.dateOffset === offset);
    const cin = day ? input.getCheckIn(day.dayIndex) : undefined;
    return {
      iso,
      title: day?.title ?? '无课',
      status: cin?.status,
    };
  });
}

/**
 * Copies text to the clipboard when available.
 * @param text - Plain text to copy.
 * @returns True when write succeeded.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Triggers a browser download of a UTF-8 text blob.
 * @param text - File contents.
 * @param filename - Suggested download name.
 */
export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
