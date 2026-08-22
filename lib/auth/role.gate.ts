import { SessionUser, UserRole } from '@/types';

import { CODES } from '@/constants/codes.const';

import { SingleResult, createError, singleFailure } from '@/lib/result';

import { getSessionUser } from './current-user';

const AUTH = CODES.AUTH.COMMON;

/**
 * The outcome of gating a server action to a set of roles: the requester, or the refusal.
 *
 * The same discriminated shape as {@link AdminAreaGate}, generalized to any roles — the queue
 * actions are a nurse's and a doctor's, not the administration area's, so they gate on the roles
 * that own the action rather than on the area.
 */
export type RoleGate<T> = { allowed: true; requester: SessionUser } | { allowed: false; refusal: SingleResult<T> };

/**
 * Gate a server action to a set of roles, returning a Result rather than redirecting.
 *
 * The sibling of `gateAdminArea` for actions that belong to a role rather than to the admin area:
 * check-in is a nurse's, calling the next patient a doctor's. Like it, this returns a failure the
 * action passes straight back for the form to render, because an action has no page to send a
 * refused caller to.
 *
 * @param allowedRoles - The roles permitted to run the action.
 *
 * @returns The requester when allowed, or a refusal to return from the action.
 */
export async function gateRoles<T>(allowedRoles: readonly UserRole[]): Promise<RoleGate<T>> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { allowed: false, refusal: singleFailure(createError(AUTH.NOT_AUTHENTICATED.CODE, AUTH.NOT_AUTHENTICATED.MESSAGE)) };
  }

  if (!allowedRoles.some(role => role === sessionUser.role)) {
    return { allowed: false, refusal: singleFailure(createError(AUTH.NOT_AUTHORIZED.CODE, AUTH.NOT_AUTHORIZED.MESSAGE)) };
  }

  return { allowed: true, requester: sessionUser };
}
