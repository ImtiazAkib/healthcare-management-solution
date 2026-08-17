import { SessionUser } from '@/types';

import { CODES } from '@/constants/codes.const';
import { ADMIN_AREA_ROLES } from '@/constants/roles.const';

import { SingleResult, createError, singleFailure } from '@/lib/result';

import { getSessionUser } from './current-user';

const AUTH = CODES.AUTH.COMMON;

/**
 * The outcome of gating a server action: either the requester, or the refusal to return.
 *
 * A discriminated union so the caller narrows on `allowed` and gets exactly one of the two
 * shapes. Generic in the DTO, so the refusal is a `SingleResult<T>` that matches whatever the
 * action returns on success.
 */
export type AdminAreaGate<T> = { allowed: true; requester: SessionUser } | { allowed: false; refusal: SingleResult<T> };

/**
 * Gate a server action to the administration area, returning a Result rather than redirecting.
 *
 * The guards in `guards.ts` redirect, which is right for a page — a refused visitor should
 * land somewhere. A server action has no page to send anyone to: it is called from a form
 * that is already rendered, and a redirect it cannot follow is worse than a refusal the form
 * can show. So this returns a failure the action passes straight back, and the form renders
 * its message.
 *
 * One gate rather than a `refuseNonAdministrator()` copied into every actions file — three
 * copies of an authorization rule are three chances to update two.
 *
 * @returns The requester when allowed, or a refusal to return from the action.
 */
export async function gateAdminArea<T>(): Promise<AdminAreaGate<T>> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { allowed: false, refusal: singleFailure(createError(AUTH.NOT_AUTHENTICATED.CODE, AUTH.NOT_AUTHENTICATED.MESSAGE)) };
  }

  if (!ADMIN_AREA_ROLES.some(role => role === sessionUser.role)) {
    return { allowed: false, refusal: singleFailure(createError(AUTH.NOT_AUTHORIZED.CODE, AUTH.NOT_AUTHORIZED.MESSAGE)) };
  }

  return { allowed: true, requester: sessionUser };
}
