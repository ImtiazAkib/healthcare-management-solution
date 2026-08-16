import { UserRole } from '@/types';

export const USER_ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  LAB: 'lab',
  PATIENT: 'patient',
} as const satisfies Record<string, UserRole>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  'super-admin': 'Super administrator',
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab: 'Diagnostic lab',
  patient: 'Patient',
};

/**
 * The roles that may enter the admin area.
 *
 * The super administrator holds every administrator power and then some, so the guard asks
 * "may this account be here" rather than "is this account an administrator" —
 * `requireRole(ADMIN)` would turn the one account that owns the area away from it.
 */
export const ADMIN_AREA_ROLES = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] as const satisfies readonly UserRole[];

/**
 * The roles that hold a staff account: created by an administrator, approved on creation,
 * and never self-registered. A patient is the only role that arrives any other way.
 */
export const STAFF_ROLES = [USER_ROLES.ADMIN, USER_ROLES.DOCTOR, USER_ROLES.NURSE, USER_ROLES.LAB] as const satisfies readonly UserRole[];

/**
 * How many active administrators the facility may have at once.
 *
 * The super administrator is not one of them — five plus one. Counted over the `admin`
 * role alone, so the arithmetic cannot be read two ways.
 */
export const ADMIN_LIMIT = 5;
