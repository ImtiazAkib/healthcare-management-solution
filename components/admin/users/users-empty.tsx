import { UsersRound } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type UsersEmptyProps = {
  /** True when filters are applied — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the list is empty. Deliberately not an error: an empty result is a normal answer
 * — either the facility has no staff accounts yet, or the current filters match none.
 */
export function UsersEmpty({ filtered }: UsersEmptyProps) {
  return (
    <EmptyState
      icon={UsersRound}
      title={filtered ? 'No accounts match these filters' : 'No staff accounts yet'}
      description={
        filtered
          ? 'Try widening the role or status, or clear the search.'
          : 'Add a doctor, nurse, lab or administrator account to get started. Patients are registered separately.'
      }
    />
  );
}
