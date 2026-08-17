'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Menu, X } from 'lucide-react';

import { APP_DATA } from '@/constants';

import { ROUTES } from '@/constants/routes.const';

import { cn } from '@/lib/utils';

import { AppLogo } from '@/components/shared';
import { Avatar, AvatarFallback, Button } from '@/components/ui';

import { DashboardNav } from './dashboard-nav';

import type { UserRole } from '@/types';

type DashboardMobileNavProps = {
  role: UserRole;
  navAriaLabel: string;
  openLabel: string;
  closeLabel: string;
  user: { name: string; roleLabel: string; initials: string; accentClassName: string };
};

/*
  The below-`lg` navigation: a left drawer behind a hamburger, so a role with several entries
  reaches all of them on a phone rather than scrolling a strip sideways. It holds the same
  three bands as the desktop sidebar from the same `resolveNavModel`, so the two never list
  different things. It slides on a transform transition, and closes when a link inside it is
  tapped — the drawer lives in the persistent layout, so that closed state carries onto the
  page just navigated to.
*/
export function DashboardMobileNav({ role, navAriaLabel, openLabel, closeLabel, user }: DashboardMobileNavProps) {
  const [open, setOpen] = useState(false);

  const handleDrawerClick = (event: React.MouseEvent<HTMLElement>): void => {
    // A tap on any link inside the drawer navigates, so close; the ✕ is a <button>, handled by Close.
    if ((event.target as HTMLElement).closest('a')) {
      setOpen(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger render={<Button variant="ghost" size="icon-sm" aria-label={openLabel} className="lg:hidden" />}>
        <Menu />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 opacity-0 transition-opacity duration-200 data-open:opacity-100 lg:hidden" />

        <DialogPrimitive.Popup
          onClick={handleDrawerClick}
          className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] -translate-x-full flex-col border-r transition-transform duration-200 ease-out outline-none data-open:translate-x-0 lg:hidden">
          <DialogPrimitive.Title className="sr-only">{navAriaLabel}</DialogPrimitive.Title>

          <div className="border-sidebar-border flex h-16 shrink-0 items-center justify-between border-b px-4">
            <Link href={ROUTES.HOME.HREF} className="flex items-center gap-2.5">
              <AppLogo className="size-8" />
              <span className="font-heading text-regular-bold text-sidebar-foreground tracking-tight">{APP_DATA.SHORT_NAME}</span>
            </Link>

            <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label={closeLabel} />}>
              <X />
            </DialogPrimitive.Close>
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
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
