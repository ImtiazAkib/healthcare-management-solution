import { LAB_STATUS_LABELS } from '@/constants';

import { Badge } from '@/components/ui';
import type { badgeVariants } from '@/components/ui';

import type { LabStatus } from './lab.types';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

type LabStatusBadgeProps = {
  status: LabStatus;
};

/** Which chip tone reads for each stage of an order's lifecycle. */
const STATUS_VARIANTS: Record<LabStatus, BadgeVariant> = {
  ordered: 'neutral',
  collected: 'neutral',
  'in-progress': 'warning',
  reported: 'warning',
  released: 'success',
  cancelled: 'destructive',
};

/**
 * A lab order's standing at a glance: still to be worked, in progress, released to the doctor, or
 * cancelled.
 */
export function LabStatusBadge({ status }: LabStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{LAB_STATUS_LABELS[status]}</Badge>;
}
