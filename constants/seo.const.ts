import { PROTECTED_SEGMENTS, ROUTES } from './routes.const';

/*
  Route segments that must never be indexed: everything behind a session, plus the sign-in
  page once it exists. Derived from `PROTECTED_SEGMENTS` so the crawler rules and the route
  guard cannot drift apart.

  Empty today — `PROTECTED_SEGMENTS` is empty until the dashboard shell lands in step 5 and
  `ROUTES` holds only the home page. It fills itself as those routes arrive, which is the
  reason for deriving it rather than writing the list twice.

  The `Disallow` lines are only a request to well-behaved crawlers. The enforcing half is
  the `noindex` metadata on the dashboard layout, which lands with the shell.
*/
const PRIVATE_SEGMENTS: readonly string[] = [...PROTECTED_SEGMENTS];

export const SEO = {
  KEYWORDS: [
    'hospital management system',
    'electronic medical records',
    'appointment scheduling',
    'patient queue management',
    'digital prescriptions',
    'diagnostic reporting',
    'patient portal',
    'role-based access control',
    'Next.js MongoDB',
  ],

  /** Public routes, in the order the sitemap lists them. */
  PUBLIC_ROUTES: [ROUTES.HOME.HREF],

  DISALLOWED_PATHS: PRIVATE_SEGMENTS,

  SITEMAP: {
    HOME_PRIORITY: 1,
    CHANGE_FREQUENCY: 'monthly',
  },
} as const;
