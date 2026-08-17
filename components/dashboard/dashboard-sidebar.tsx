import Link from 'next/link';

import { APP_DATA, ROUTES } from '@/constants';

import { cn } from '@/lib/utils';

import { AppLogo } from '@/components/shared';
import { Avatar, AvatarFallback } from '@/components/ui';

import { DashboardNav } from './dashboard-nav';

import type { UserRole } from '@/types';

type DashboardSidebarProps = {
  role: UserRole;
  navAriaLabel: string;
  user: { name: string; roleLabel: string; initials: string; accentClassName: string };
};

/*
  Hidden below `lg`, where the same nav runs in a drawer instead. Three bands: a logo header
  the height of the topbar so the two line up across the shell, the scrolling sectioned nav,
  and a user block pinned to the bottom carrying identity — who-am-I on a shared screen.

  The user block is a plain block rather than a link, because the profile page it will point
  at lands in step 16. When it does, this becomes a `Link` to it.
*/
export function DashboardSidebar({ role, navAriaLabel, user }: DashboardSidebarProps) {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
      <div className="border-sidebar-border flex h-16 shrink-0 items-center border-b px-4">
        <Link href={ROUTES.HOME.HREF} className="flex items-center gap-2.5">
          <AppLogo className="size-8" />
          <span className="font-heading text-regular-bold text-sidebar-foreground tracking-tight">{APP_DATA.SHORT_NAME}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <DashboardNav role={role} ariaLabel={navAriaLabel} variant="sidebar" />
      </div>

      <div className="border-sidebar-border flex shrink-0 items-center gap-2.5 border-t p-4">
        <Avatar className="size-8">
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>

        <span className="flex min-w-0 flex-col">
          <span className="text-sidebar-foreground truncate text-sm font-medium">{user.name}</span>
          <span className={cn('truncate text-xs font-medium', user.accentClassName)}>{user.roleLabel}</span>
        </span>
      </div>
    </aside>
  );
}
