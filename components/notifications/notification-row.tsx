'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { NOTIFICATION_KIND_LABELS } from '@/constants';

import { cn, formatShortDateTime } from '@/lib/utils';

import { markNotificationReadAction } from './actions';

import type { NotificationRowProps } from './notifications.types';

/*
  One notification, as a button so the whole row is the target. Clicking it marks the notification read
  and — when it points at something — navigates the viewer's own area to it.

  Marking read is best-effort: the click optimistically flips the unread dot off and fires the action,
  but a refused mark leaves the row usable rather than trapping the click. The row carries no clinical
  detail itself — the kind label and subject are the pointer, "your result is ready", never the result.
*/
export function NotificationRow({ notification }: NotificationRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRead, setIsRead] = useState(notification.isRead);

  const isFailed = notification.status === 'failed';

  const handleClick = (): void => {
    // Optimistic: the dot goes at once. A failed mark simply leaves it as it was on the next read.
    if (!isRead) {
      setIsRead(true);
      startTransition(async () => {
        await markNotificationReadAction(notification.notificationId);
      });
    }

    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={isPending}
      className={cn(
        'border-border flex w-full flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors',
        'hover:bg-muted/50 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-hidden',
        !isRead && 'bg-muted/30'
      )}>
      <div className="flex items-start gap-2">
        {!isRead && <span aria-hidden className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className={cn('text-sm wrap-break-word', !isRead ? 'font-semibold' : 'font-medium')}>{notification.subject}</p>
            <span className="text-muted-foreground shrink-0 text-xs">{formatShortDateTime(notification.createdAt)}</span>
          </div>

          <p className="text-muted-foreground text-xs">{NOTIFICATION_KIND_LABELS[notification.kind]}</p>

          {notification.body && <p className="text-sm wrap-break-word whitespace-pre-line">{notification.body}</p>}

          {isFailed && (
            <p className="text-destructive text-xs">Delivery failed{notification.failureReason ? ` — ${notification.failureReason}` : ''}.</p>
          )}
        </div>
      </div>

      {!isRead && <span className="sr-only">Unread</span>}
    </button>
  );
}
