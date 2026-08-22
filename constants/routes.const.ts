import { UserRole } from '@/types';

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
  SIGN_IN: {
    LABEL: 'Sign in',
    HREF: '/sign-in',
  },
  UNAUTHORIZED: {
    LABEL: 'Not allowed',
    HREF: '/unauthorized',
  },

  // --- Role areas ---
  ADMIN: {
    LABEL: 'Administration',
    HREF: '/admin',
  },
  ADMIN_USERS: {
    LABEL: 'Staff accounts',
    HREF: '/admin/users',
  },
  ADMIN_USERS_NEW: {
    LABEL: 'Add a staff account',
    HREF: '/admin/users/new',
  },
  ADMIN_DEPARTMENTS: {
    LABEL: 'Departments',
    HREF: '/admin/departments',
  },
  ADMIN_DEPARTMENTS_NEW: {
    LABEL: 'Add a department',
    HREF: '/admin/departments/new',
  },
  ADMIN_SERVICES: {
    LABEL: 'Service catalogue',
    HREF: '/admin/services',
  },
  ADMIN_SERVICES_NEW: {
    LABEL: 'Add a service',
    HREF: '/admin/services/new',
  },
  ADMIN_PATIENTS: {
    LABEL: 'Patients',
    HREF: '/admin/patients',
  },
  ADMIN_PATIENTS_NEW: {
    LABEL: 'Register a patient',
    HREF: '/admin/patients/new',
  },
  DOCTOR: {
    LABEL: 'Doctor',
    HREF: '/doctor',
  },
  NURSE: {
    LABEL: 'Nurse',
    HREF: '/nurse',
  },
  LAB: {
    LABEL: 'Diagnostic lab',
    HREF: '/lab',
  },
  PATIENT: {
    LABEL: 'My health',
    HREF: '/patient',
  },
} as const;

/**
 * Where each role lands after signing in, and the only area it may enter.
 *
 * `as const satisfies Record<UserRole, string>` — the `satisfies` makes it exhaustive, so a
 * new role is a compile error here rather than an account that signs in and lands nowhere,
 * while `as const` keeps the literal union `typedRoutes` needs.
 */
export const ROLE_HOME = {
  // The super administrator lands in the admin area — it is their area too, with more in it.
  'super-admin': ROUTES.ADMIN.HREF,
  admin: ROUTES.ADMIN.HREF,
  doctor: ROUTES.DOCTOR.HREF,
  nurse: ROUTES.NURSE.HREF,
  lab: ROUTES.LAB.HREF,
  patient: ROUTES.PATIENT.HREF,
} as const satisfies Record<UserRole, string>;

/*
  Route segments that require a session. One list, used twice: `proxy.ts` guards them and
  `seo.const.ts` disallows them in robots.txt. Keeping it single-sourced is what stops a
  route from being open to crawlers but unguarded, or the reverse.

  `/profile` will be listed explicitly when it lands, because it is the one signed-in route
  that sits outside a role's own area — every other protected path begins with one of these
  prefixes and is covered whether anybody remembers it or not.
*/
export const PROTECTED_SEGMENTS = [ROUTES.ADMIN.HREF, ROUTES.DOCTOR.HREF, ROUTES.NURSE.HREF, ROUTES.LAB.HREF, ROUTES.PATIENT.HREF] as const;

/** Anchors on the landing page. */
export const SECTION_IDS = {
  ROLES: 'roles',
  FEATURES: 'features',
  STACK: 'stack',
  ROADMAP: 'roadmap',
} as const;
