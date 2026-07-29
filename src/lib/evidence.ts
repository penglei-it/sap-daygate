/**
 * Evidence quality and integrity helpers.
 */

/**
 * Checks whether evidence text is strong enough to count for Pass.
 * Rejects empty, tiny, repeated-character, and symbol-only strings.
 * @param evidence - Raw evidence from learner.
 * @param opts.gate - Gate days require a longer minimum.
 * @returns True when evidence passes quality bar.
 */
export function isEvidenceAcceptable(
  evidence: string,
  opts: { gate?: boolean } = {},
): boolean {
  const text = (evidence ?? '').trim();
  const min = opts.gate ? 12 : 8;
  if (text.length < min) return false;
  if (/^(.)\1+$/u.test(text)) return false;
  // Require at least one letter or number (incl. CJK).
  if (!/[\p{L}\p{N}]/u.test(text)) return false;
  return true;
}

/**
 * SHA-256 hash of evidence for integrity tracing (not anti-tamper absolute).
 * @param evidence - Evidence text.
 * @returns Hex digest or empty string.
 */
export async function hashEvidence(evidence: string): Promise<string> {
  const text = evidence.trim();
  if (!text) return '';
  const data = new TextEncoder().encode(`daygate-evidence-v1:${text}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
