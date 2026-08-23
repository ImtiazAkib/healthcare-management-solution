'use server';

import { env } from '@/env/server';
import { ProfileDto } from '@/types';

import { USER_ROLES } from '@/constants/roles.const';
import { ROUTES } from '@/constants/routes.const';

import { gateRoles, setSessionCookie } from '@/lib/auth';
import { buildVerifyEmailChangeMail, mail } from '@/lib/mail';
import { EmptyResult, SingleResult, emptyFailureWithErrors, isSuccess, singleFailureWithErrors, singleSuccess } from '@/lib/result';
import { PasswordChangeSchema, ProfileContactSchema, ProfileUpdateSchema } from '@/lib/schemas';
import { ProfileService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const profileService = new ProfileService();

// Every signed-in role edits the same profile page, so every role gates through.
const EVERY_ROLE = Object.values(USER_ROLES);

/*
  The session-authenticated half of Profiles: editing your own account from a screen you reached
  signed in. The token-authenticated half — confirming an email change from a link — lives with the
  other inbox flows in `components/auth/registration.actions.ts`, because it carries no session.

  Two things are load-bearing here. The cookie is **re-issued from the saved record**, so the name
  the topbar greets you by is the one you just saved, and an email change — which has not taken
  effect — cannot slip into the session ahead of being proven. And the confirmation link is built
  from `env.APP_BASE_URL`, **never a request header**, for the same reason the registration links are.
*/

/** Build an absolute email-change confirmation link from the configured base URL — never the request host. */
function buildConfirmEmailChangeUrl(token: string): string {
  return `${env.APP_BASE_URL}${ROUTES.VERIFY_EMAIL_CHANGE.HREF}?token=${encodeURIComponent(token)}`;
}

/**
 * Save a person's own name, phone, gender and date of birth, and — held aside until proven — a new
 * email address.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The updated profile, or a failure naming the field that refused it.
 */
export async function updateProfileAction(values: unknown): Promise<SingleResult<ProfileDto>> {
  const gate = await gateRoles<ProfileDto>(EVERY_ROLE);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = ProfileUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  const result = await profileService.updateProfile(validation.data, gate.requester);

  if (!isSuccess(result) || !result.result) {
    return singleFailureWithErrors(result.errors);
  }

  const { profile, session, pendingEmailToken } = result.result;

  // Only when the address actually changed, and always to the new address — proving it is reachable.
  if (pendingEmailToken && profile.pendingEmail) {
    // A failed send does not undo the save; the address stays pending and can be requested again.
    await mail.send(buildVerifyEmailChangeMail(profile.pendingEmail, profile.name, buildConfirmEmailChangeUrl(pendingEmailToken)));
  }

  // Re-issued from the saved record — carries the new name and the old, still-in-force email.
  await setSessionCookie(session);

  return singleSuccess(profile);
}

/**
 * Change a person's own password.
 *
 * @param values - Raw form values (current password, new password, confirmation).
 *
 * @returns An empty success, or a failure carrying the reason.
 */
export async function changePasswordAction(values: unknown): Promise<EmptyResult> {
  const gate = await gateRoles(EVERY_ROLE);

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  const validation = PasswordChangeSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return profileService.changePassword(validation.data, gate.requester);
}

/**
 * Save a patient's own emergency contact and address.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The updated profile, or a failure.
 */
export async function updateContactAction(values: unknown): Promise<SingleResult<ProfileDto>> {
  const gate = await gateRoles<ProfileDto>([USER_ROLES.PATIENT]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = ProfileContactSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return profileService.updateContact(validation.data, gate.requester);
}
