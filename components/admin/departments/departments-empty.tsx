import { Building2 } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type DepartmentsEmptyProps = {
  /** True when filters are applied — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the list is empty. Deliberately not an error: an empty result is a normal answer
 * — either the hospital has no departments yet, or the current filters match none.
 */
export function DepartmentsEmpty({ filtered }: DepartmentsEmptyProps) {
  return (
    <EmptyState
      icon={Building2}
      title={filtered ? 'No departments match these filters' : 'No departments yet'}
      description={filtered ? 'Try widening the status, or clear the search.' : 'Add a department to get started.'}
    />
  );
}
