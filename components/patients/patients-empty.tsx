import { UsersRound } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type PatientsEmptyProps = {
  /** True when the search box is set — the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the registry is empty. Not an error: either no patients are registered yet, or the
 * search matches none.
 */
export function PatientsEmpty({ filtered }: PatientsEmptyProps) {
  return (
    <EmptyState
      icon={UsersRound}
      title={filtered ? 'No patients match your search' : 'No patients registered yet'}
      description={
        filtered ? 'Try a record number, a phone number, or part of a name.' : 'Register a patient at the counter to give them a record number.'
      }
    />
  );
}
