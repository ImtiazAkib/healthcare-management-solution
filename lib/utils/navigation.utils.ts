import type { Route } from 'next';

import {
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  Pill,
  UsersRound,
} from 'lucide-react';

import { ADMIN_AREA_ROLES, USER_ROLES } from '@/constants/roles.const';
import { ROLE_HOME, ROUTES } from '@/constants/routes.const';

import type { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';

/*
  `href` is a `Route`, not a `string`: `typedRoutes` refuses a `<Link>` whose target it
  cannot prove exists, so the nav model has to carry proven routes rather than widen them to
  strings on the way through.
*/
export type NavItem = { href: Route; icon: LucideIcon; label: string };
export type NavSection = { id: string; label: string | null; items: NavItem[] };
export type Crumb = { label: string; current: boolean };

/**
 * The dashboard navigation as data, grouped into sections.
 *
 * One source for three consumers — the sidebar, the breadcrumb and the mobile drawer — so
 * the three cannot drift. This is why the labels live here rather than inline in each: copy
 * stays in the component until a second consumer needs it, and three do.
 *
 * **Role visibility is decided here, not at render.** An entry a role cannot reach is never
 * in its model, so it is hidden entirely rather than disabled, and an empty section drops
 * out. `typedRoutes` also means only routes that exist may appear, which is why every role
 * currently carries just its Overview: the sub-pages append here as the steps that build
 * them land, each one a route this function can finally point at.
 *
 * @param role - The signed-in account's role.
 *
 * @returns The visible sections for this role, empty sections removed.
 */
export function resolveNavModel(role: UserRole): NavSection[] {
  const isAdminArea = ADMIN_AREA_ROLES.some(adminRole => adminRole === role);

  const administration: NavItem[] = [];
  if (isAdminArea) {
    administration.push({ href: ROUTES.ADMIN_USERS.HREF, icon: UsersRound, label: 'Staff accounts' });
    administration.push({ href: ROUTES.ADMIN_PATIENTS.HREF, icon: HeartPulse, label: 'Patients' });
    administration.push({ href: ROUTES.ADMIN_DEPARTMENTS.HREF, icon: Building2, label: 'Departments' });
    administration.push({ href: ROUTES.ADMIN_AVAILABILITY.HREF, icon: CalendarClock, label: 'Availability' });
    administration.push({ href: ROUTES.ADMIN_APPOINTMENTS.HREF, icon: CalendarCheck, label: 'Appointments' });
    administration.push({ href: ROUTES.ADMIN_SERVICES.HREF, icon: ClipboardList, label: 'Service catalogue' });
  }

  // A doctor's own tools, and a nurse's — the schedule an administrator publishes, and the live queue.
  const clinical: NavItem[] = [];
  if (role === USER_ROLES.DOCTOR) {
    clinical.push({ href: ROUTES.DOCTOR_AVAILABILITY.HREF, icon: CalendarClock, label: 'My availability' });
    clinical.push({ href: ROUTES.DOCTOR_APPOINTMENTS.HREF, icon: CalendarCheck, label: 'Appointments' });
    clinical.push({ href: ROUTES.DOCTOR_QUEUE.HREF, icon: ListOrdered, label: 'Queue' });
    clinical.push({ href: ROUTES.DOCTOR_PATIENTS.HREF, icon: HeartPulse, label: 'Patients' });
    clinical.push({ href: ROUTES.DOCTOR_PRESCRIPTIONS.HREF, icon: Pill, label: 'Prescriptions' });
    clinical.push({ href: ROUTES.DOCTOR_LAB_ORDERS.HREF, icon: FlaskConical, label: 'Lab orders' });
  }

  if (role === USER_ROLES.NURSE) {
    clinical.push({ href: ROUTES.NURSE_QUEUE.HREF, icon: ListOrdered, label: 'Queue' });
    clinical.push({ href: ROUTES.NURSE_PATIENTS.HREF, icon: HeartPulse, label: 'Patients' });
  }

  // The diagnostic lab works one list — the orders waiting on it.
  if (role === USER_ROLES.LAB) {
    clinical.push({ href: ROUTES.LAB_ORDERS.HREF, icon: FlaskConical, label: 'Lab orders' });
  }

  // A patient's own portal — their appointments, records, and the one thing they can do: book.
  if (role === USER_ROLES.PATIENT) {
    clinical.push({ href: ROUTES.PATIENT_APPOINTMENTS.HREF, icon: CalendarCheck, label: 'Appointments' });
    clinical.push({ href: ROUTES.PATIENT_RECORDS.HREF, icon: ClipboardList, label: 'My records' });
    clinical.push({ href: ROUTES.PATIENT_PRESCRIPTIONS.HREF, icon: Pill, label: 'Prescriptions' });
    clinical.push({ href: ROUTES.PATIENT_REPORTS.HREF, icon: FlaskConical, label: 'Test results' });
    clinical.push({ href: ROUTES.PATIENT_DOCTORS.HREF, icon: UsersRound, label: 'Find a doctor' });
  }

  const sections: NavSection[] = [
    { id: 'overview', label: null, items: [{ href: ROLE_HOME[role], icon: LayoutDashboard, label: 'Overview' }] },
    { id: 'administration', label: 'Administration', items: administration },
    { id: 'clinical', label: null, items: clinical },
  ];

  return sections.filter(section => section.items.length > 0);
}

/**
 * Whether a nav entry is the current page.
 *
 * The overview entry matches its route **exactly** — its href (`/admin`, `/doctor`) is a
 * prefix of every page in the area, so a `startsWith` there would light it up everywhere.
 * Every other entry also matches its own sub-pages, so `/admin/users/new` still reads as
 * "Users" rather than highlighting nothing.
 *
 * @param pathname - The current path.
 * @param href - The entry's route.
 * @param exact - True for the overview entry.
 *
 * @returns Whether the entry represents the current location.
 */
export function isNavItemActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The topbar location trail for a path: the section it belongs to, then the page itself. On
 * an area home it collapses to the single Overview crumb. The section crumb is a plain label,
 * not a link — sections have no landing page of their own.
 *
 * @param pathname - The current path.
 * @param sections - The role's nav model.
 * @param overviewLabel - The label for the area-home crumb.
 *
 * @returns The crumbs from section to current page.
 */
export function resolveBreadcrumbTrail(pathname: string, sections: NavSection[], overviewLabel: string): Crumb[] {
  const overviewHref = sections.find(section => section.id === 'overview')?.items[0]?.href;

  if (overviewHref && pathname === overviewHref) {
    return [{ label: overviewLabel, current: true }];
  }

  for (const section of sections) {
    if (section.id === 'overview') {
      continue;
    }

    for (const item of section.items) {
      if (isNavItemActive(pathname, item.href, false)) {
        const crumbs: Crumb[] = [];
        if (section.label) {
          crumbs.push({ label: section.label, current: false });
        }
        crumbs.push({ label: item.label, current: true });

        return crumbs;
      }
    }
  }

  return [{ label: overviewLabel, current: true }];
}

/**
 * Up-to-two-letter initials for an avatar fallback, since the app stores no photos.
 *
 * One name gives its first two letters; two or more give the first letter of the first and
 * last. `Array.from` so a surrogate-pair first character is not sliced in half.
 *
 * @param name - The person's display name.
 *
 * @returns The uppercased initials, or `?` for an empty name.
 */
export function resolveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  }

  return (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase();
}
