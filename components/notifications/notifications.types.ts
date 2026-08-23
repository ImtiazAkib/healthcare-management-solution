import type { Route } from 'next';

import type { NotificationDto } from '@/types';

export type NotificationRowProps = {
  notification: NotificationDto;
};

export type NotificationListProps = {
  notifications: NotificationDto[];
};

export type NotificationBellProps = {
  notifications: NotificationDto[];
  unreadCount: number;
  /** The role area's notifications page — the "See all" link, typed so a stale route is a build error. */
  allHref: Route;
};
