import { NextResponse, type NextRequest } from 'next/server';

import { SESSION } from '@/constants/auth.const';
import { PROTECTED_SEGMENTS, ROUTES } from '@/constants/routes.const';

import { isSameOriginRequest } from '@/lib/api/same-origin.guard';
/*
  Imported from `session.ts`, not the `@/lib/auth` barrel: the barrel also exports the cookie
  helpers, which use `next/headers` — unavailable in the middleware runtime. Verifying a
  token needs only `jose`, which runs there happily.
*/
import { verifySessionToken } from '@/lib/auth/session';

/*
  Next.js 16 calls this file `proxy.ts` (it was `middleware.ts` before). Only one is allowed,
  and here it does one job: decide whether a request is allowed to reach a protected route at
  all.

  **This is a perimeter, not the control.** It answers "is there a session"; the page answers
  "is it the right one", and every service re-checks besides. A guard that only ran here
  would be a guard a Server Action could walk around.
*/
export async function proxy(request: NextRequest) {
  /*
    API routes are answered first. They exist only for this app's own screens, so a request
    that did not come from a page of ours is refused here, before the handler reads a body or
    touches the database.
  */
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Forbidden action.' }, { status: 403 });
    }

    return NextResponse.next();
  }

  const routePath = request.nextUrl.pathname;

  /*
    Exact-or-child, so `/administration` cannot be caught by `/admin`. A prefix test alone
    would guard routes nobody meant to guard, and the day one of those is public it fails
    silently in the direction nobody checks.
  */
  const isProtected = PROTECTED_SEGMENTS.some(segment => routePath === segment || routePath.startsWith(`${segment}/`));

  if (isProtected) {
    // Only verify where it matters — a public page should not pay for the check.
    const token = request.cookies.get(SESSION.COOKIE.NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      /*
        Signature, expiry, issuer and audience only. **No database touch here** — the
        middleware runtime cannot reach Mongoose, and the live re-validation that catches a
        deactivated account belongs in `getSessionUser`, which every guarded page calls.
      */
      const signInUrl = new URL(ROUTES.SIGN_IN.HREF, request.nextUrl.origin);
      signInUrl.searchParams.set('next', request.nextUrl.pathname);

      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  /*
    `api` is deliberately not excluded — the same-origin refusal above cannot run on a path
    the matcher never hands over. Next internals and anything with a file extension stay out.
  */
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
