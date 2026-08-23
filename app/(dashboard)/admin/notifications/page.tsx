import type { Metadata } from 'next';

import { requireAdminArea } from '@/lib/auth';
import { NotificationService } from '@/lib/services';

import { NotificationList } from '@/components/notifications';
import { PageHeader } from '@/components/ui';

const notificationService = new NotificationService();

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage() {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  const session = await requireAdminArea();

  const result = await notificationService.listForRecipient(session.userId);

  // A failed read is thrown, not shown as an empty list — an unreachable database is not "all caught up".
  if (!result.success) {
    throw new Error('Could not load your notifications. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" description="Confirmations, reminders and alerts aimed at you." />

      <NotificationList notifications={result.result} />
    </div>
  );
}
