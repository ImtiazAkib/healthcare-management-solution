import { TRIAGE_PRIORITY_LABELS, TRIAGE_PRIORITY_VARIANTS } from '@/constants';

import { Badge } from '@/components/ui';

import type { TriagePriorityBadgeProps } from './vitals.types';

/** The triage priority as a chip, coloured by urgency so it reads at a glance down the queue. */
export function TriagePriorityBadge({ priority }: TriagePriorityBadgeProps) {
  return <Badge variant={TRIAGE_PRIORITY_VARIANTS[priority]}>{TRIAGE_PRIORITY_LABELS[priority]}</Badge>;
}
