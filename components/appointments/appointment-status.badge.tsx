import { AppointmentStatus } from '@/types';

import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_LABELS } from '@/constants/appointment.const';

import { Badge } from '@/components/ui';
import type { badgeVariants } from '@/components/ui';

import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

/*
  Each lifecycle status reads as a calm chip in its own color: the ones still ahead of the visit
  are informational, check-in is a warning that the patient is waiting, the consultation itself is
  the loud primary, a completed visit is a success, a cancellation is neutral (it simply released
  its slot), and a no-show is the one destructive note. Mapped once here so every list, the day's
  table and the queue that reuses this badge agree on the color.
*/
const STATUS_VARIANTS: Record<AppointmentStatus, BadgeVariant> = {
  [APPOINTMENT_STATUSES.REQUESTED]: 'info',
  [APPOINTMENT_STATUSES.CONFIRMED]: 'info',
  [APPOINTMENT_STATUSES.CHECKED_IN]: 'warning',
  [APPOINTMENT_STATUSES.IN_CONSULTATION]: 'default',
  [APPOINTMENT_STATUSES.COMPLETED]: 'success',
  [APPOINTMENT_STATUSES.CANCELLED]: 'neutral',
  [APPOINTMENT_STATUSES.NO_SHOW]: 'destructive',
};

type AppointmentStatusBadgeProps = {
  status: AppointmentStatus;
};

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}
