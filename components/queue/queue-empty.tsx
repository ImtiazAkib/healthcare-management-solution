import { Users } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/**
 * Shown when the live queue is empty. Not an error: nobody has been checked in yet, so there is
 * simply no one waiting.
 */
export function QueueEmpty() {
  return <EmptyState icon={Users} title="No one is waiting" description="Checked-in patients appear here as they arrive." />;
}
