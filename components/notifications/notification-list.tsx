'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui';

import { markAllNotificationsReadAction } from './actions';
import { NotificationRow } from './notification-row';
import { NotificationsEmpty } from './notifications-empty';

import type { NotificationListProps } from './notifications.types';

/*
  The full notifications feed, newest first — the service decides the order, this only lays them out.
  "Mark all read" is offered only while something is unread; it fires the action and refreshes so the
  page re-reads with every dot cleared. Best-effort, like the per-row mark: a refused call leaves the
  list as it was rather than trapping the click.
*/
export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (notifications.length === 0) {
    return <NotificationsEmpty />;
  }

  const hasUnread = notifications.some(notification => !notification.isRead);

  const handleMarkAllClick = (): void => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleMarkAllClick}>
            <CheckCheck className="size-4" />
            {isPending ? 'Marking…' : 'Mark all read'}
          </Button>
        </div>
      )}

      {notifications.map(notification => (
        <NotificationRow key={notification.notificationId} notification={notification} />
      ))}
    </div>
  );
}
