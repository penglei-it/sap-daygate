/**
 * Local security helpers for DayGate (PIN hashing).
 */

/**
 * Hashes a guardian PIN with SHA-256.
 * Empty pin returns empty string (means "no pin configured").
 * @param pin - Raw PIN entered by user.
 * @returns Hex digest or empty string.
 */
export async function hashPin(pin: string): Promise<string> {
  const trimmed = pin.trim();
  if (!trimmed) return '';
  const data = new TextEncoder().encode(`daygate-guardian-v1:${trimmed}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time-ish string compare for equal-length digests.
 * @param a - Left digest.
 * @param b - Right digest.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/**
 * Verifies raw PIN against stored hash.
 * @param rawPin - User input.
 * @param storedHash - Persisted hash (or empty if unset).
 */
export async function verifyPin(
  rawPin: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) return true;
  const hashed = await hashPin(rawPin);
  return safeEqual(hashed, storedHash);
}
