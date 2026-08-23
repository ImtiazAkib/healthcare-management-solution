import { EncounterStatus } from '@/types';

import { ENCOUNTER_STATUSES, ENCOUNTER_STATUS_LABELS } from '@/constants/encounter.const';

import { Badge } from '@/components/ui';
import type { badgeVariants } from '@/components/ui';

import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

/*
  Two states, two colors: an open encounter is a warning — a visit still in progress, a record
  not yet closed — and a completed one is the calm success. Mapped once here so the timeline, the
  detail header and any list agree on the color.
*/
const STATUS_VARIANTS: Record<EncounterStatus, BadgeVariant> = {
  [ENCOUNTER_STATUSES.OPEN]: 'warning',
  [ENCOUNTER_STATUSES.COMPLETED]: 'success',
};

type EncounterStatusBadgeProps = {
  status: EncounterStatus;
};

export function EncounterStatusBadge({ status }: EncounterStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{ENCOUNTER_STATUS_LABELS[status]}</Badge>;
}
