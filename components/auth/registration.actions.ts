'use server';

import { z } from 'zod';

import { env } from '@/env/server';

import { ROUTES } from '@/constants/routes.const';

import { buildPasswordResetMail, buildVerifyAddressMail, mail } from '@/lib/mail';
import { EmptyResult, emptyFailureWithErrors, emptySuccess, isSuccess } from '@/lib/result';
import { PasswordResetSchema, PatientRegistrationSchema, VerificationTokenSchema } from '@/lib/schemas';
import { RegistrationService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const registrationService = new RegistrationService();

// The email-only screens (resend, forgot password) validate just the address's shape.
const EmailSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

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
