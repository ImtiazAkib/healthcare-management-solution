import { ScrollText } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type AuditEmptyProps = {
  /** True when filters are applied — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the trail has no rows. An empty trail is a normal answer, not an error: either no record
 * has been accessed yet, or the current outcome and search match none of the ones that have.
 */
export function AuditEmpty({ filtered }: AuditEmptyProps) {
  return (
    <EmptyState
      icon={ScrollText}
      title={filtered ? 'No access matches these filters' : 'No access recorded yet'}
      description={
        filtered
          ? 'Try switching the outcome, or clear the actor search.'
          : 'Every time a record is opened or a report downloaded, it is logged here.'
      }
    />
  );
}
