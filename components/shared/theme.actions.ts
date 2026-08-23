'use server';

import { cookies } from 'next/headers';

import { THEME, THEMES, isTheme } from '@/constants/theme.const';

const production = process.env.NODE_ENV === 'production';

/**
 * Persist the visitor's theme choice in the cookie the layout reads.
 *
 * The selector flips the class on <html> itself for instant feedback; this action is the
 * durable half — it is what makes the next server render ship the same class from the first
 * byte. As the only writer of a cookie the reader trusts, it is also the gate: an
 * unrecognized value stores "system" rather than something the reader would have to defend
 * against.
 *
 * @param value - The requested theme, validated here rather than trusted.
 */
export async function setThemeAction(value: unknown): Promise<void> {
  const theme = isTheme(value) ? value : THEMES.SYSTEM;
  const store = await cookies();

  store.set(THEME.COOKIE.NAME, theme, {
    /*
      Not httpOnly, unlike the session cookie: a display preference carries no session power,
      and leaving it script-readable lets the client confirm the stored choice without a
      round trip. `secure` still gates it to HTTPS in production.
    */
    httpOnly: false,
    sameSite: 'lax',
    secure: production,
    path: '/',
    maxAge: THEME.COOKIE.MAX_AGE,
  });
}
