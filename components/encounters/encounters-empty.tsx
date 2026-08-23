import { FileText } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/**
 * Shown when a patient has no encounters yet. Not an error — the record simply has not started.
 */
export function EncountersEmpty() {
  return (
    <EmptyState
      icon={FileText}
      title="No encounters recorded yet"
      description="When this patient is seen in a consultation, the visit is recorded here."
    />
  );
}
