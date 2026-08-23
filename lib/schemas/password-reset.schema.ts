import { z } from 'zod';

import { CODES } from '@/constants/codes.const';

import { encodeZodMessage } from '@/lib/utils';

import { userFields } from './user-fields.schema';
import { VerificationTokenSchema } from './verification-token.schema';

const USERS = CODES.VALIDATION.USERS;

/*
  Set a new password from a link. The token proves the request on its own — the same 64-hex shape
  every one-time link in the app carries — so there is no session and nothing identifying in the
  payload beyond it. Two password boxes that must agree, the same confirmation as changing a password
  from inside the account.
*/
export const PasswordResetSchema = z
  .object({
    token: VerificationTokenSchema,
    password: userFields.password,
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    message: encodeZodMessage(USERS.PASSWORD_MISMATCH.CODE, USERS.PASSWORD_MISMATCH.MESSAGE),
    path: ['confirmPassword'],
  });

export type PasswordResetInput = z.input<typeof PasswordResetSchema>;
export type PasswordResetOutput = z.output<typeof PasswordResetSchema>;
