import { ClipboardList } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type ServicesEmptyProps = {
  /** True when filters are applied — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the catalogue is empty. Deliberately not an error: an empty result is a normal
 * answer — either the hospital has priced no services yet, or the current filters match none.
 */
export function ServicesEmpty({ filtered }: ServicesEmptyProps) {
  return (
    <EmptyState
      icon={ClipboardList}
      title={filtered ? 'No services match these filters' : 'No services yet'}
      description={filtered ? 'Try widening the category or status, or clear the search.' : 'Add a service to start the catalogue.'}
    />
  );
}
