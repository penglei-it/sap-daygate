import { describe, expect, it } from 'vitest';
import {
  findLastActivityAt,
  formatBackupPreviewSummary,
  formatBackupTime,
  parseBackupPreview,
} from './backupPreview';

describe('backupPreview', () => {
  it('parses a typical backup into preview fields', () => {
    const raw = JSON.stringify({
      displayName: '小明',
      packId: 'skill-sap-abap',
      startDate: '2026-07-01',
      onboardingDone: true,
      checkIns: {
        'skill-sap-abap:1': { status: 'pass', checkedAt: '2026-07-02T10:00:00.000Z' },
        'skill-sap-abap:2': { status: 'pass', checkedAt: '2026-07-03T12:00:00.000Z' },
      },
      schemaVersion: 3,
    });
    const result = parseBackupPreview(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.displayName).toBe('小明');
    expect(result.preview.packId).toBe('skill-sap-abap');
    expect(result.preview.startDate).toBe('2026-07-01');
    expect(result.preview.checkInCount).toBe(2);
    expect(result.preview.lastActivityAt).toBe('2026-07-03T12:00:00.000Z');
    expect(result.preview.onboardingDone).toBe(true);
    expect(result.raw).toBe(raw.trim());
  });

  it('rejects empty, corrupt, and non-backup JSON', () => {
    expect(parseBackupPreview('').ok).toBe(false);
    expect(parseBackupPreview('{not-json').ok).toBe(false);
    expect(parseBackupPreview('[]').ok).toBe(false);
    expect(parseBackupPreview(JSON.stringify({ title: 'pack only' })).ok).toBe(
      false,
    );
  });

  it('finds latest activity and formats summary', () => {
    expect(
      findLastActivityAt({
        a: { checkedAt: '2026-01-01T00:00:00.000Z' },
        b: { checkedAt: '2026-02-01T00:00:00.000Z' },
      }),
    ).toBe('2026-02-01T00:00:00.000Z');
    expect(findLastActivityAt(undefined)).toBeNull();
    expect(formatBackupTime(null)).toBe('尚无');
    expect(formatBackupTime('not-a-date')).toBe('尚无');

    const summary = formatBackupPreviewSummary({
      displayName: 'A',
      packId: 'p',
      startDate: '2026-01-01',
      checkInCount: 0,
      lastActivityAt: null,
      onboardingDone: false,
    });
    expect(summary).toContain('姓名：A');
    expect(summary).toContain('打卡条数：0');
    expect(summary).toContain('最后活动：无打卡记录');
  });
});
