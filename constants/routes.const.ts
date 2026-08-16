/*
  `typedRoutes` is on, so a `<Link>` to a route that does not exist is a build error rather
  than a 404 a visitor finds. Every entry here is therefore a route that already exists —
  the rest arrive with the steps that build them.
*/
export const ROUTES = {
  // --- Main Pages ---
  HOME: {
    LABEL: 'Home',
    HREF: '/',
  },
} as const;

/*
  Route segments that require a session. One list, used twice: `proxy.ts` guards them from
  step 4 and `seo.const.ts` disallows them in robots.txt from step 2. Keeping it
  single-sourced is what stops a route from being open to crawlers but unguarded, or the
  reverse.

  Empty until the dashboard shell lands in step 5.
*/
export const PROTECTED_SEGMENTS = [] as const;

/** Anchors on the landing page. */
export const SECTION_IDS = {
  ROLES: 'roles',
  FEATURES: 'features',
  STACK: 'stack',
  ROADMAP: 'roadmap',
} as const;
