/*
  The three-way theme choice. "system" is the absence of a preference: it writes no explicit
  class on <html>, so the `prefers-color-scheme` cascade in globals.css follows the device.
  "light" and "dark" are the two overrides that pin the app regardless of the device.
*/
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

export const THEME = {
  COOKIE: {
    /* Namespaced like the session cookie so the app's cookies read as one family. */
    NAME: 'caresync.theme',
    /*
      One year. A display preference is not a security token: it is meant to outlive the
      hour-long session and ride along with every request so the server can render the right
      class on <html> from the first byte, with no flash and no blocking script.
    */
    MAX_AGE: 60 * 60 * 24 * 365,
  },
  /* What an absent or unrecognized cookie resolves to — match the device. */
  DEFAULT: THEMES.SYSTEM,
} as const;

export const THEME_LABELS: Record<Theme, string> = {
  [THEMES.LIGHT]: 'Light',
  [THEMES.DARK]: 'Dark',
  [THEMES.SYSTEM]: 'System',
};

/**
 * Narrow an untrusted value (a cookie string, a form value) to a {@link Theme}.
 *
 * The single gate both the reader and the writer use, so neither has to trust the other's
 * output or reach for a cast.
 */
export function isTheme(value: unknown): value is Theme {
  return value === THEMES.LIGHT || value === THEMES.DARK || value === THEMES.SYSTEM;
}
