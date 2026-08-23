import { createHash } from 'node:crypto';

/**
 * Reduce a one-time token to what is safe to store.
 *
 * Verification tokens and password-reset tokens are minted and checked in more than one place, so
 * the hash lives here rather than being a private method on a service. Two copies of this would be
 * two chances to change one — and a token hashed one way and looked up another is a link that never
 * works, discovered by the person it was sent to.
 *
 * Unsalted SHA-256 on purpose, unlike a password. The input is 32 bytes of `randomBytes` rather than
 * something somebody chose, so there is no dictionary to precompute and nothing a slow hash would
 * buy — while a lookup by hash has to be a single indexed query, which a per-row salt would make
 * impossible.
 *
 * @param token - The raw token from a link.
 *
 * @returns Its hex-encoded digest, which is what the database holds.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
