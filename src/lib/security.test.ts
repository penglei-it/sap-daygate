import { describe, expect, it } from 'vitest';
import { hashPin, safeEqual, verifyPin } from './security';

describe('security pin hashing', () => {
  it('hashes non-empty pin stably', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });

  it('returns empty hash for empty pin', async () => {
    expect(await hashPin('')).toBe('');
    expect(await hashPin('   ')).toBe('');
  });

  it('verifies pin against hash', async () => {
    const hash = await hashPin('abcd');
    expect(await verifyPin('abcd', hash)).toBe(true);
    expect(await verifyPin('wrong', hash)).toBe(false);
    expect(await verifyPin('anything', '')).toBe(true);
  });

  it('safeEqual rejects different lengths', () => {
    expect(safeEqual('aa', 'a')).toBe(false);
    expect(safeEqual('ab', 'ab')).toBe(true);
  });
});
