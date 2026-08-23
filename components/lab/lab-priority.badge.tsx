import { LAB_PRIORITY_LABELS } from '@/constants';

import { Badge } from '@/components/ui';
import type { badgeVariants } from '@/components/ui';

import type { LabPriority } from './lab.types';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

type LabPriorityBadgeProps = {
  priority: LabPriority;
};

/** How loud the priority chip reads: routine stays calm, immediate is a warning. */
const PRIORITY_VARIANTS: Record<LabPriority, BadgeVariant> = {
  routine: 'neutral',
  urgent: 'warning',
  stat: 'destructive',
};

/**
 * How urgently an order should be worked, at a glance.
 */
export function LabPriorityBadge({ priority }: LabPriorityBadgeProps) {
  return <Badge variant={PRIORITY_VARIANTS[priority]}>{LAB_PRIORITY_LABELS[priority]}</Badge>;
}
