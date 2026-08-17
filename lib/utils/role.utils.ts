import { USER_ROLE_LABELS, USER_ROLES } from '@/constants/roles.const';

import type { UserRole } from '@/types';

/**
 * The label a role is shown under. A thin read of `USER_ROLE_LABELS` so the label lookup has
 * one home, and so a component asks `resolveRoleLabel(role)` rather than reaching into a map.
 *
 * @param role - The role to label.
 *
 * @returns The role's display name.
 */
export function resolveRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/**
 * The accent a role area is tinted with — administrator violet, doctor blue, nurse teal,
 * lab amber, patient rose. The super administrator borrows the administrator's, since it is
 * the administrator's area with more in it.
 *
 * **Color is a label here, not decoration.** It marks the role badge in the shell so a
 * clinician glancing at a shared screen can tell whose session is open. It is deliberately
 * a text/icon accent, not the nav's active-state background: the accents were contrast-
 * verified as text on card, while the active nav uses the sidebar token pair that was
 * verified for that job.
 */
const ROLE_ACCENT_CLASS: Record<UserRole, string> = {
  [USER_ROLES.SUPER_ADMIN]: 'text-accent-violet',
  [USER_ROLES.ADMIN]: 'text-accent-violet',
  [USER_ROLES.DOCTOR]: 'text-accent-blue',
  [USER_ROLES.NURSE]: 'text-accent-teal',
  [USER_ROLES.LAB]: 'text-accent-amber',
  [USER_ROLES.PATIENT]: 'text-accent-rose',
};

/**
 * The accent class for a role. See {@link ROLE_ACCENT_CLASS}.
 *
 * @param role - The role to tint for.
 *
 * @returns A Tailwind text-color class.
 */
export function roleAccentClassName(role: UserRole): string {
  return ROLE_ACCENT_CLASS[role];
}
