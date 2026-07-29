import { describe, expect, it } from 'vitest';
import { formatPackIssuesZh, packIssueToZh } from './packIssueZh';

describe('packIssueZh', () => {
  it('translates day-count gate', () => {
    expect(
      packIssueToZh('Pack x must have at least 14 days (has 7)'),
    ).toContain('14');
  });

  it('formats day-scoped errors', () => {
    const lines = formatPackIssuesZh([
      { level: 'error', dayIndex: 2, message: 'content must be >= 60 chars' },
      { level: 'warning', message: 'Duplicate title: x' },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('第 2 天');
  });
});
