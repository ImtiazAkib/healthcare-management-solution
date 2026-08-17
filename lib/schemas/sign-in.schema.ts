import { z } from 'zod';

import { CODES } from '@/constants/codes.const';

import { encodeZodMessage } from '@/lib/utils';

const USERS = CODES.VALIDATION.USERS;

/*
  Everybody signs in with their email address — a doctor, a nurse, the lab account and a
  patient alike. There is no separate identifier scheme and no role picker beside the
  password: asking somebody to classify themselves before the app has any reason to care is
  a question with no good answer for the person who forgot which kind of account they have.

  The address is deliberately **not** validated as an email here. A typo should be refused by
  "that email and password do not match" — the same answer a wrong password gets — rather
  than by a format error, which would tell an anonymous visitor whether a string is even
  shaped like one of our addresses.

  The password is only checked for presence. A length rule here would reject a valid existing
  password if the policy ever changed, and it advertises the policy to anyone with the
  sign-in page open. Strength is enforced where passwords are set, not where they are used.
*/
export const SignInSchema = z.object({
  identifier: z.string().trim().min(1, encodeZodMessage(USERS.EMAIL_REQUIRED.CODE, 'Enter your email address.')),
  password: z.string().min(1, encodeZodMessage(USERS.PASSWORD_TOO_SHORT.CODE, 'Enter your password.')),
});

export type SignInInput = z.input<typeof SignInSchema>;
export type SignInOutput = z.output<typeof SignInSchema>;
