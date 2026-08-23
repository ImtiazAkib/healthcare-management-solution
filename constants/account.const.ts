/**
 * Email verification and password-reset token policy.
 *
 * The token is `randomBytes(TOKEN_BYTES).toString('hex')` — 32 bytes, so 64 hex characters, which
 * the verification-token schema derives its length check from rather than hard-coding. It is stored
 * hashed, single-use and short-lived: a link works once, expires after `LIFETIME_HOURS`, and cannot
 * be reissued faster than `RESEND_COOLDOWN_MINUTES` so a resend button is not a mail cannon.
 */
export const EMAIL_VERIFICATION = {
  TOKEN_BYTES: 32,
  LIFETIME_HOURS: 24,
  RESEND_COOLDOWN_MINUTES: 2,
} as const;
