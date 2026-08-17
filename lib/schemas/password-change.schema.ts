import { z } from 'zod';

import { CODES } from '@/constants/codes.const';

import { encodeZodMessage } from '@/lib/utils';

import { userFields } from './user-fields.schema';

const USERS = CODES.VALIDATION.USERS;

/*
  Changing your own password, from a screen you reached with a live session.

  The current password is required and checked by the service. Not because the session is in
  doubt — it is — but because a session left open on a ward computer is the realistic threat
  here, and the current password is the one thing the person who walked up to it does not
  have.

  The confirmation is compared in a `superRefine` and reported on the confirmation field,
  which is the box somebody would go and correct. Reporting it on the new-password field
  instead sends them to retype the one that was probably right.
*/
export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, encodeZodMessage(USERS.CURRENT_PASSWORD_REQUIRED.CODE, USERS.CURRENT_PASSWORD_REQUIRED.MESSAGE)),
    newPassword: userFields.password,
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: encodeZodMessage(USERS.PASSWORD_MISMATCH.CODE, USERS.PASSWORD_MISMATCH.MESSAGE),
      });
    }
  });

export type PasswordChangeInput = z.input<typeof PasswordChangeSchema>;
export type PasswordChangeOutput = z.output<typeof PasswordChangeSchema>;
