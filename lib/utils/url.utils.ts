/**
 * Join an absolute origin and a path into one absolute URL.
 *
 * The metadata routes, the sitemap and the JSON-LD graph all need absolute URLs, and each
 * of them would otherwise reinvent the same slash arithmetic — the home path is `/`, which
 * naively concatenated against an origin gives a double slash or none at all depending on
 * how the origin was typed.
 *
 * @param baseUrl - Absolute origin, with or without a trailing slash.
 * @param path - Path beginning with a slash. Defaults to the home page.
 *
 * @returns Absolute URL. The home page keeps its single trailing slash.
 */
export function buildAbsoluteUrl(baseUrl: string, path = '/'): string {
  const origin = baseUrl.replace(/\/+$/, '');

  return path === '/' ? `${origin}/` : `${origin}${path}`;
}
