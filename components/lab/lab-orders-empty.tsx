import { FlaskConical } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/**
 * Shown when there are no lab orders to list — the lab's work list with nothing outstanding, or a
 * doctor who has ordered none. Not an error: an empty list is a normal, quiet state, and fills as
 * orders are raised.
 */
export function LabOrdersEmpty() {
  return <EmptyState icon={FlaskConical} title="No lab orders yet" description="Orders raised during a consultation appear here." />;
}
