'use client';

import { useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Bell } from 'lucide-react';

import { NOTIFICATION_KIND_LABELS } from '@/constants';

import { cn, formatShortDateTime } from '@/lib/utils';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';

import { markNotificationReadAction } from './actions';

import type { NotificationBellProps } from './notifications.types';

/** How many notifications the dropdown previews before "See all" carries the rest. */
const PREVIEW_COUNT = 5;

/** The badge caps at this — an exact count past it is noise, "9+" says "a lot" just as well. */
const BADGE_CAP = 9;

/*
  The topbar bell: an icon carrying an unread count, opening the same dropdown primitive the account
  menu uses. It previews the most recent few notifications and links to the viewer's own notifications
  page for the rest — the `allHref` is passed in typed, so the bell stays area-agnostic and a stale
  route is a build error.

  Clicking a preview marks it read and refreshes; the click closes the menu, so the mark is fire-and-
  forget rather than spinner-tracked. Best-effort throughout — a refused mark leaves the badge as it
  was on the next read.
*/
export function NotificationBell({ notifications, unreadCount, allHref }: NotificationBellProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const preview = notifications.slice(0, PREVIEW_COUNT);
  const hasUnread = unreadCount > 0;
  const badgeLabel = unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : String(unreadCount);

  const handleNotificationClick = (notification: (typeof notifications)[number]): void => {
    if (!notification.isRead) {
      startTransition(async () => {
        await markNotificationReadAction(notification.notificationId);
      });
    }

    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          />
        }>
        <Bell className="size-5" />
        {hasUnread && (
          <span
            aria-hidden
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-medium">
            {badgeLabel}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="text-foreground text-sm font-medium">Notifications</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {preview.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">You have no notifications.</p>
        ) : (
          preview.map(notification => (
            <DropdownMenuItem
              key={notification.notificationId}
              className="flex flex-col items-start gap-0.5"
              onClick={() => handleNotificationClick(notification)}>
              <div className="flex w-full items-start gap-2">
                {!notification.isRead && <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />}
                <span className={cn('min-w-0 flex-1 truncate text-sm', !notification.isRead && 'font-medium')}>{notification.subject}</span>
              </div>
              <span className="text-muted-foreground pl-3.5 text-xs">
                {NOTIFICATION_KIND_LABELS[notification.kind]} · {formatShortDateTime(notification.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />

        <DropdownMenuLinkItem render={<Link href={allHref} />} className="justify-center text-sm font-medium">
          See all
        </DropdownMenuLinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
