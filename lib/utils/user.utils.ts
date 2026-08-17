import { UserStatus } from '@/types';

import type { UserDto } from '@/types';

/**
 * Which of the three states a staff account is in.
 *
 * Read from the flags rather than stored, and in a fixed order: switched off wins over
 * everything (an inactive account is inactive whether or not it was approved), then approval.
 * An account that is active but not yet approved is `pending` — waiting on the hospital.
 *
 * @param user - The account.
 *
 * @returns Its status.
 */
export function resolveUserStatus(user: Pick<UserDto, 'isApproved' | 'isActive'>): UserStatus {
  if (!user.isActive) {
    return 'inactive';
  }

  return user.isApproved ? 'active' : 'pending';
}

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: 'Awaiting approval',
  active: 'Active',
  inactive: 'Deactivated',
};

/**
 * The label a status is shown under.
 *
 * @param status - The status to label.
 *
 * @returns Its display name.
 */
export function resolveUserStatusLabel(status: UserStatus): string {
  return USER_STATUS_LABELS[status];
}

const USER_STATUS_BADGE_VARIANT: Record<UserStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};

/**
 * The badge variant a status wears — green for active, amber for waiting, grey for off.
 *
 * @param status - The status to color.
 *
 * @returns The badge variant.
 */
export function resolveUserStatusBadgeVariant(status: UserStatus): 'success' | 'warning' | 'neutral' {
  return USER_STATUS_BADGE_VARIANT[status];
}
