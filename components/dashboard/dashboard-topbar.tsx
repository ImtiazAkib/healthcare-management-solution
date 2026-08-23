import type { Route } from 'next';

import { NotificationBell } from '@/components/notifications';
import { ThemeSelector } from '@/components/shared';

import { AccountMenu } from './account-menu';
import { DashboardBreadcrumb } from './dashboard-breadcrumb';
import { DashboardMobileNav } from './dashboard-mobile-nav';

import type { NotificationDto, UserRole } from '@/types';

type DashboardTopbarProps = {
  role: UserRole;
  user: { name: string; roleLabel: string; initials: string; accentClassName: string };
  /** The bell's data, resolved once in the layout: the recent notifications, the unread count, and where "see all" goes. */
  notifications: { items: NotificationDto[]; unreadCount: number; allHref: Route };
};

/*
  One row: on the left the mobile menu button (below `lg`, where the sidebar is hidden) and
  the location breadcrumb; on the right the theme toggle, the notification bell and the
  account cluster. There is no language selector, because there is one language.

  Its labels are literal here rather than props: the topbar has one caller, the dashboard
  layout, so there is no second consumer to lift them to a shared place for.
*/
export function DashboardTopbar({ role, user, notifications }: DashboardTopbarProps) {
  return (
    <header className="border-border bg-background z-40 shrink-0 border-b">
      <div className="flex h-16 items-center gap-2 px-4 lg:px-8">
        <DashboardMobileNav role={role} navAriaLabel="Main navigation" openLabel="Open the menu" closeLabel="Close the menu" user={user} />

        <DashboardBreadcrumb role={role} overviewLabel="Overview" ariaLabel="Breadcrumb" />

        <div className="ms-auto flex shrink-0 items-center gap-2">
          <ThemeSelector />

          <NotificationBell notifications={notifications.items} unreadCount={notifications.unreadCount} allHref={notifications.allHref} />

          <AccountMenu
            name={user.name}
            roleLabel={user.roleLabel}
            initials={user.initials}
            accentClassName={user.accentClassName}
            signOutLabel="Sign out"
            signingOutLabel="Signing out…"
          />
        </div>
      </div>
    </header>
  );
}
