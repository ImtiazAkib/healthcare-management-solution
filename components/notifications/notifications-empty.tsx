import { Bell } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/*
  Nothing to show — genuinely empty, not a failed read. A page whose query failed throws and renders
  its error boundary instead, so an unreachable database never reads as "you're all caught up".
*/
export function NotificationsEmpty() {
  return <EmptyState icon={Bell} title="No notifications" description="Confirmations, reminders and alerts aimed at you will appear here." />;
}
