import { cookies } from 'next/headers';

import { SessionUser } from '@/types';

import { SESSION } from '@/constants/auth.const';

import { createSessionToken } from './session';

const production = process.env.NODE_ENV === 'production';

/**
 * Sign the visitor in by writing the session cookie.
 *
 * `httpOnly` keeps the token away from any script on the page, which is what stops a
 * cross-site scripting bug from turning into a stolen session. `sameSite: lax` stops another
 * site posting to ours with the visitor's cookie attached.
 *
 * @param user - Who the session belongs to.
 */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();

  store.set(SESSION.COOKIE.NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    maxAge: SESSION.COOKIE.MAX_AGE,
  });
}

/**
 * Sign the visitor out by removing the session cookie.
 *
 * Expired with the same `path` and attributes it was set under, not a bare `delete(name)`.
 * The cookie lives at `path: '/'`; a delete that does not say so lands on the path the
 * sign-out action ran at instead — leaving the real cookie in place, so the visitor is
 * still signed in and `/sign-in` bounces them straight back.
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();

  store.set(SESSION.COOKIE.NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    maxAge: 0,
  });
}
