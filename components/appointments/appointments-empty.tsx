import { CalendarDays } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type AppointmentsEmptyProps = {
  /** True when a filter is applied — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the day's list is empty. Not an error: either nothing is booked yet, or the filters
 * match nothing.
 */
export function AppointmentsEmpty({ filtered }: AppointmentsEmptyProps) {
  return (
    <EmptyState
      icon={CalendarDays}
      title={filtered ? 'No appointments match your filters' : 'No appointments booked yet'}
      description={
        filtered
          ? 'Try another doctor, another day, or clear the status filter.'
          : "Book at the counter against a doctor's published hours to start the day's list."
      }
    />
  );
}
