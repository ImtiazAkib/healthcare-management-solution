import { z } from 'zod';

import { EMAIL_VERIFICATION } from '@/constants/account.const';
import { CODES } from '@/constants/codes.const';

import { encodeZodMessage } from '@/lib/utils';

const REGISTRATION = CODES.VALIDATION.REGISTRATION;

/*
  The shape `randomBytes(TOKEN_BYTES).toString('hex')` produces, and nothing else.

  Refusing a malformed token here is the same answer one round trip earlier: without this, a junk
  token becomes an empty string, is hashed, and costs a database lookup before matching nothing. The
  message is deliberately the invalid-link one, because to the person holding the link that is
  exactly what it is. The length is derived — hex is two characters per byte — so it cannot drift if
  the token ever gets longer.
*/
export const VerificationTokenSchema = z
  .string()
  .trim()
  .length(
    EMAIL_VERIFICATION.TOKEN_BYTES * 2,
    encodeZodMessage(REGISTRATION.VERIFICATION_LINK_INVALID.CODE, REGISTRATION.VERIFICATION_LINK_INVALID.MESSAGE)
  )
  .regex(/^[a-f\d]+$/i, encodeZodMessage(REGISTRATION.VERIFICATION_LINK_INVALID.CODE, REGISTRATION.VERIFICATION_LINK_INVALID.MESSAGE));

export type VerificationTokenInput = z.input<typeof VerificationTokenSchema>;
export type VerificationTokenOutput = z.output<typeof VerificationTokenSchema>;
