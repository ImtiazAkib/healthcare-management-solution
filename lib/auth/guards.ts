import { redirect } from 'next/navigation';

import { SessionUser, UserRole } from '@/types';

import { ADMIN_AREA_ROLES } from '@/constants/roles.const';
import { ROUTES } from '@/constants/routes.const';

import { getSessionUser } from './current-user';

/**
 * Require a session, or send the visitor to sign in.
 *
 * Redirects rather than returning `null`, so a caller cannot forget the refused case and
 * render a page to nobody. `redirect` from `next/navigation` is typed `never`, so the
 * compiler knows execution stops here and every caller is handed a `SessionUser` rather
 * than a nullable one.
 *
 * @returns The signed-in user.
 */
export async function requireSession(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(ROUTES.SIGN_IN.HREF);
  }

  return sessionUser;
}

/**
 * Require a specific role.
 *
 * **A wrong role is not a missing session.** Sending both to sign-in would tell an
 * already-authenticated nurse to sign in again, which reads as a bug rather than a refusal —
 * so this lands on `/unauthorized`, a 403 with a link to the visitor's own area.
 *
 * @param role - The role the area belongs to.
 *
 * @returns The signed-in user.
 */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const sessionUser = await requireSession();

  if (sessionUser.role !== role) {
    redirect(ROUTES.UNAUTHORIZED.HREF);
  }

  return sessionUser;
}

/**
 * Require one of the roles that may enter the administration area.
 *
 * Exists instead of `requireRole(ADMIN)` because the super administrator holds every
 * administrator power and then some — `requireRole(ADMIN)` would turn the one account that
 * owns the area away from it.
 *
 * The membership test is `.some(...)` rather than `.includes(...)`: `ADMIN_AREA_ROLES` is a
 * readonly tuple of two literals, so `includes` against a wider `UserRole` is a type error.
 *
 * @returns The signed-in user.
 */
export async function requireAdminArea(): Promise<SessionUser> {
  const sessionUser = await requireSession();

  if (!ADMIN_AREA_ROLES.some(role => role === sessionUser.role)) {
    redirect(ROUTES.UNAUTHORIZED.HREF);
  }

  return sessionUser;
}
