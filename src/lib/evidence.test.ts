import { describe, expect, it } from 'vitest';
import { hashEvidence, isEvidenceAcceptable } from './evidence';

describe('evidence quality', () => {
  it('accepts substantive paths', () => {
    expect(isEvidenceAcceptable('SAP-Growth/M1-demo', { gate: true })).toBe(true);
  });

  it('rejects short or repeated evidence', () => {
    expect(isEvidenceAcceptable('abc', { gate: false })).toBe(false);
    expect(isEvidenceAcceptable('xxxxxxxxxxxx', { gate: true })).toBe(false);
    expect(isEvidenceAcceptable('!!!!!!!!!!', { gate: false })).toBe(false);
  });

  it('hashes evidence stably', async () => {
    const a = await hashEvidence('folder/readme.md');
    const b = await hashEvidence('folder/readme.md');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });
});
