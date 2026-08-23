import { cookies } from 'next/headers';

import { THEME, THEMES, isTheme, type Theme } from '@/constants/theme.const';

/**
 * Read the stored theme from the request cookie, on the server.
 *
 * The root layout calls this to put the matching class on <html> before a byte ships, which
 * is what keeps an explicit light/dark choice from flashing the wrong way on first paint. A
 * missing or tampered cookie resolves to "system" so the device preference decides.
 */
export async function readTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME.COOKIE.NAME)?.value;

  return isTheme(value) ? value : THEMES.SYSTEM;
}
