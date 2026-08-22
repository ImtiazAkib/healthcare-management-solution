import { CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type AvailabilityEmptyProps = {
  /** True when filters are applied — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the week is empty. Not an error: either no availability has been published yet, or
 * the current doctor, day and status filters match none.
 */
export function AvailabilityEmpty({ filtered }: AvailabilityEmptyProps) {
  return (
    <EmptyState
      icon={CalendarClock}
      title={filtered ? 'No availability matches these filters' : 'No availability published yet'}
      description={filtered ? 'Try another doctor or day, or widen the status.' : "Publish a doctor's sitting hours to get started."}
    />
  );
}
