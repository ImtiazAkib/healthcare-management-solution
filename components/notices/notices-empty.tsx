import { Megaphone } from 'lucide-react';

import { EmptyState } from '@/components/ui';

/*
  Nothing to show — genuinely empty, not a failed read. A screen whose query failed renders a
  `role="alert"` banner instead (see `dashboard-notices`), so an unreachable database never reads as
  "you're all caught up".
*/
export function NoticesEmpty() {
  return <EmptyState icon={Megaphone} title="No notices" description="Announcements aimed at you will appear here." />;
}
