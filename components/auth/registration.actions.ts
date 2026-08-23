'use server';

import { headers } from 'next/headers';

import { z } from 'zod';

import { env } from '@/env/server';

import { CODES } from '@/constants/codes.const';
import { RATE_LIMIT, RateLimitBudget } from '@/constants/rate-limit.const';
import { ROUTES } from '@/constants/routes.const';

import { getSessionUser, setSessionCookie } from '@/lib/auth';
import { buildPasswordResetMail, buildVerifyAddressMail, mail } from '@/lib/mail';
import { EmptyResult, createError, emptyFailureWithErrors, emptySuccess, isSuccess } from '@/lib/result';
import { PasswordResetSchema, PatientRegistrationSchema, VerificationTokenSchema } from '@/lib/schemas';
import { ProfileService, RegistrationService, consumeRateLimit } from '@/lib/services';
import { mapZodErrorsToErrorDto, resolveCallerKey } from '@/lib/utils';

const registrationService = new RegistrationService();
const profileService = new ProfileService();

const TOO_MANY = CODES.BUSINESS.COMMON.TOO_MANY_REQUESTS;

// The email-only screens (resend, forgot password) validate just the address's shape.
const EmailSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

/**
 * Whether a public account flow has been called too often from this caller.
 *
 * Keyed on the caller, which is only meaningful behind a trusted proxy — without one every caller
 * shares the `unknown-caller` bucket, and the flows stay bounded by other means (registration by email
 * uniqueness, resend by a per-account cooldown) as the guard fails open regardless.
 *
 * @param scope - The budget's scope.
 * @param budget - The limit and window.
 *
 * @returns True when the caller is over budget and should be refused.
 */
async function callerFlooded(scope: string, budget: RateLimitBudget): Promise<boolean> {
  const caller = resolveCallerKey(await headers(), env.TRUSTED_PROXY);

  return !(await consumeRateLimit(scope, caller, budget));
}

/*
  The unauthenticated account flows: register, verify, resend, forgot and reset.

  Two things are load-bearing here. **Links are built from `env.APP_BASE_URL`, never a request
  header** — a `Host` an attacker controls would send the verification link to their own site. And
  **resend and forgot-password never say whether an address is registered**: the service returns a
  silent success for an unknown address, and these actions send a mail only when it hands one back, so
  the screen answers the same either way. Confirming an address is registered would confirm that a
  person is a patient.

  Rate limiting these public endpoints lands in step 21a; the flow here calls the limiter it adds.
*/

/** Build an absolute verification link from the configured base URL — never from the request host. */
function buildVerifyUrl(token: string): string {
  return `${env.APP_BASE_URL}${ROUTES.VERIFY_EMAIL.HREF}?token=${encodeURIComponent(token)}`;
}

/** Build an absolute password-reset link from the configured base URL. */
function buildResetUrl(token: string): string {
  return `${env.APP_BASE_URL}${ROUTES.RESET_PASSWORD.HREF}?token=${encodeURIComponent(token)}`;
}

/**
 * Register a patient and mail them a verification link.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns An empty success once the account exists (the link is on its way), or a failure.
 */
export async function registerPatientAction(values: unknown): Promise<EmptyResult> {
  if (await callerFlooded('register', RATE_LIMIT.REGISTER)) {
    return emptyFailureWithErrors([createError(TOO_MANY.CODE, TOO_MANY.MESSAGE)]);
  }

  const validation = PatientRegistrationSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await registrationService.register(validation.data);

  if (!isSuccess(result) || !result.result) {
    return emptyFailureWithErrors(result.errors);
  }

  // A failed send does not undo the account — the "check your inbox" screen offers a resend.
  await mail.send(buildVerifyAddressMail(result.result.user.email, result.result.user.name, buildVerifyUrl(result.result.verificationToken)));

  return emptySuccess();
}

/**
 * Confirm an email address from the link's token.
 *
 * @param token - The raw token from the link.
 *
 * @returns An empty success, or an invalid/expired-link failure.
 */
export async function verifyEmailAction(token: unknown): Promise<EmptyResult> {
  const validation = VerificationTokenSchema.safeParse(token);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await registrationService.verifyEmail(validation.data);

  if (!isSuccess(result)) {
    return emptyFailureWithErrors(result.errors);
  }

  return emptySuccess();
}

/**
 * Resend a verification link. Non-enumerating: it answers the same whether or not the address is
 * registered, sending a mail only when the service hands one back.
 *
 * @param values - Raw form values carrying the email.
 *
 * @returns An empty success (or a shape-validation failure for a malformed address).
 */
export async function resendConfirmationAction(values: unknown): Promise<EmptyResult> {
  if (await callerFlooded('resend', RATE_LIMIT.RESEND)) {
    return emptyFailureWithErrors([createError(TOO_MANY.CODE, TOO_MANY.MESSAGE)]);
  }

  const validation = EmailSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await registrationService.reissueVerification(validation.data.email);

  if (isSuccess(result) && result.result) {
    await mail.send(buildVerifyAddressMail(result.result.user.email, result.result.user.name, buildVerifyUrl(result.result.verificationToken)));
  }

  return emptySuccess();
}

/**
 * Request a password-reset link. Non-enumerating, the same as resend.
 *
 * @param values - Raw form values carrying the email.
 *
 * @returns An empty success (or a shape-validation failure for a malformed address).
 */
export async function requestPasswordResetAction(values: unknown): Promise<EmptyResult> {
  if (await callerFlooded('password-reset', RATE_LIMIT.PASSWORD_RESET)) {
    return emptyFailureWithErrors([createError(TOO_MANY.CODE, TOO_MANY.MESSAGE)]);
  }

  const validation = EmailSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await registrationService.issuePasswordReset(validation.data.email);

  if (isSuccess(result) && result.result) {
    await mail.send(buildPasswordResetMail(result.result.user.email, result.result.user.name, buildResetUrl(result.result.resetToken)));
  }

  return emptySuccess();
}

/**
 * Set a new password from a reset link.
 *
 * @param values - Raw form values (the token and both password boxes).
 *
 * @returns An empty success, or a failure carrying the reason.
 */
export async function resetPasswordAction(values: unknown): Promise<EmptyResult> {
  const validation = PasswordResetSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await registrationService.resetPassword(validation.data.token, validation.data.password);

  if (!isSuccess(result)) {
    return emptyFailureWithErrors(result.errors);
  }

  return emptySuccess();
}

/**
 * Confirm a requested email change from the link's token, and make the new address the one in force.
 *
 * Opened from an inbox, so it carries no session and validates the token alone. When the browser
 * following the link happens to be signed in as the same account, its cookie is re-issued with the
 * new address so the topbar and the next request agree at once; otherwise the change simply takes
 * effect and shows on the next sign-in.
 *
 * @param token - The raw token from the link.
 *
 * @returns An empty success, or an invalid/expired-link failure.
 */
export async function confirmEmailChangeAction(token: unknown): Promise<EmptyResult> {
  const validation = VerificationTokenSchema.safeParse(token);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await profileService.confirmEmailChange(validation.data);

  if (!isSuccess(result) || !result.result) {
    return emptyFailureWithErrors(result.errors);
  }

  const session = await getSessionUser();

  if (session && session.userId === result.result.userId) {
    await setSessionCookie({ ...session, email: result.result.email });
  }

  return emptySuccess();
}
