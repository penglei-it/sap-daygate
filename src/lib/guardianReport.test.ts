import { describe, expect, it } from 'vitest';
import { buildGuardianWeeklyReportText } from './guardianReport';
import type { GuardianSummary } from '../core/guardian';

const summary: GuardianSummary = {
  learnerName: '小明',
  packTitle: '示例课表',
  passCount: 3,
  partialCount: 1,
  failCount: 0,
  totalDays: 14,
  completionRate: 21,
  streakDays: 2,
  missedLast7: 1,
  todayTitle: '第3天',
  todayStatus: 'pass',
  softReminder: '今天已经完成验收，可以给一句具体表扬。',
};

describe('guardianReport', () => {
  it('builds plain-text weekly report', () => {
    const text = buildGuardianWeeklyReportText({
      summary,
      weekCells: [
        { iso: '2026-07-23', title: '无课' },
        { iso: '2026-07-24', title: '第1天', status: 'pass' },
      ],
      generatedAt: '2026-07-29T00:00:00.000Z',
    });
    expect(text).toContain('小明');
    expect(text).toContain('示例课表');
    expect(text).toContain('通过数：3 / 14');
    expect(text).toContain('近 7 日中断：1 天');
    expect(text).toContain('连续进展：2 天');
    expect(text).toContain('软提醒：');
    expect(text).toContain('2026-07-24 · 第1天');
    expect(text).not.toContain('上传到服务器');
  });
});
