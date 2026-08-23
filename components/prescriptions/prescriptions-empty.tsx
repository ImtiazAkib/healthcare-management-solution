import { Pill } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/**
 * Shown when the doctor has issued no prescriptions yet. Not an error — a new doctor's list starts
 * empty, and fills as they write scripts during consultations.
 */
export function PrescriptionsEmpty() {
  return (
    <EmptyState
      icon={Pill}
      title="No prescriptions issued yet"
      description="Prescriptions you write during a consultation appear here, newest first."
    />
  );
}
