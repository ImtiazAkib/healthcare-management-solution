'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from '@/env/server';
import { UserRole } from '@/types';

import { CODES } from '@/constants/codes.const';
import { RATE_LIMIT } from '@/constants/rate-limit.const';
import { ROUTES } from '@/constants/routes.const';

import { clearSessionCookie, setSessionCookie } from '@/lib/auth';
import { SingleResult, createError, isSuccess, singleFailureWithErrors, singleSuccess } from '@/lib/result';
import { SignInSchema } from '@/lib/schemas';
import { AuthService, consumeRateLimit } from '@/lib/services';
import { mapZodErrorsToErrorDto, resolveCallerKey } from '@/lib/utils';

const AUTH = CODES.AUTH.USERS;
const TOO_MANY = CODES.BUSINESS.COMMON.TOO_MANY_REQUESTS;

const authService = new AuthService();

/**
 * Sign in with an email address and a password.
 *
 * The service decides whether the credentials are good and why not; this action validates
 * the shape, then turns a successful verification into a session cookie.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The role to navigate to, or a failure carrying the reason's code.
 */
export async function signInAction(values: unknown): Promise<SingleResult<UserRole>> {
  const validation = SignInSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  /*
    A looser cap per caller, on top of the per-identifier failure limit in the service: one machine
    cannot spray many identifiers to work around a limit that is keyed on each identifier alone. Only
    meaningful behind a trusted proxy — without one every caller shares the `unknown-caller` bucket.
  */
  const caller = resolveCallerKey(await headers(), env.TRUSTED_PROXY);
  if (!(await consumeRateLimit('sign-in-caller', caller, RATE_LIMIT.SIGN_IN_CALLER))) {
    return singleFailureWithErrors([createError(TOO_MANY.CODE, TOO_MANY.MESSAGE)]);
  }

  const result = await authService.verifyCredentials(validation.data.identifier, validation.data.password);

  if (!isSuccess(result) || !result.result) {
    const errors = result.errors.length > 0 ? result.errors : [createError(AUTH.SIGN_IN_FAILED.CODE, AUTH.SIGN_IN_FAILED.MESSAGE)];

    return singleFailureWithErrors(errors);
  }

  const user = result.result;

  await setSessionCookie({
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    isApproved: user.isApproved,
  });

  /*
    The **role** comes back, not a destination. `ROLE_HOME` is a literal union, so the client
    navigates to a route `typedRoutes` already knows — no string is built from user input,
    which is what an open redirect is made of.
  */
  return singleSuccess(user.role);
}

/**
 * Sign out and return to the sign-in page.
 *
 * Takes no arguments and returns nothing: there is one thing to do and no input that could
 * change it.
 */
export async function signOutAction(): Promise<void> {
  await clearSessionCookie();

  redirect(ROUTES.SIGN_IN.HREF);
}
