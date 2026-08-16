import type { NextRequest } from 'next/server';

/*
  Whether a request came from this app rather than from somewhere else.

  A shared secret header is the usual answer, and it does not work here: these routes are
  called from the browser — an upload form's `fetch` and a report download link — so a
  secret would either ship in the client bundle or be impossible to send at all, since a
  plain `<a href>` cannot set headers. The same-origin question is the one that can actually
  be answered.

  `Sec-Fetch-Site` is the reliable signal: the browser sets it, and a page cannot forge it
  because it is a forbidden header name. `Origin` and `Referer` are the fallback for
  anything that does not send it — weaker, since a non-browser client writes whatever it
  likes, but a non-browser client is exactly what this refuses by default.
*/
export function isSameOriginRequest(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');

  if (site) {
    /*
      `same-origin` is the app calling itself. `none` means a typed URL or a bookmark —
      refused on purpose: these routes exist for the app's own screens, and a diagnostic
      report fetched by pasting its URL has skipped every page that decides who may see it.
    */
    return site === 'same-origin';
  }

  const source = request.headers.get('origin') ?? request.headers.get('referer');

  if (!source) {
    return false;
  }

  try {
    return new URL(source).host === request.headers.get('host');
  } catch {
    // A malformed Origin is not a browser being helpful.
    return false;
  }
}
