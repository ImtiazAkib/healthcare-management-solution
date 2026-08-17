'use server';

import { redirect } from 'next/navigation';

import { UserRole } from '@/types';

import { CODES } from '@/constants/codes.const';
import { ROUTES } from '@/constants/routes.const';

import { clearSessionCookie, setSessionCookie } from '@/lib/auth';
import { SingleResult, createError, isSuccess, singleFailureWithErrors, singleSuccess } from '@/lib/result';
import { SignInSchema } from '@/lib/schemas';
import { AuthService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const AUTH = CODES.AUTH.USERS;

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
