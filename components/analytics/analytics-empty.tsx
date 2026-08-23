import { ChartColumnBig } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/**
 * Shown when the whole window held no activity at all — no appointments, no revenue, no new patients.
 * An empty window is a normal answer, not a failed query, so it reads as "widen the dates" rather than
 * an error. A query that actually failed throws on the server and never reaches this screen.
 */
export function AnalyticsEmpty() {
  return (
    <EmptyState
      icon={ChartColumnBig}
      title="Nothing happened in this window"
      description="No appointments, invoices or registrations fall in the selected dates. Widen the window to see the figures."
    />
  );
}
