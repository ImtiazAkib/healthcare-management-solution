'use client';

import { useTransition } from 'react';

import Link from 'next/link';

import { ChevronDown, LogOut, UserRound } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { cn } from '@/lib/utils';

import { signOutAction } from '@/components/auth/actions';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
} from '@/components/ui';

type AccountMenuProps = {
  name: string;
  roleLabel: string;
  initials: string;
  accentClassName: string;
  signOutLabel: string;
  signingOutLabel: string;
};

/*
  The account cluster in the topbar's right corner — avatar + name opening a menu that names
  the account and signs out. It calls `signOutAction` directly inside a transition rather than
  submitting a form, so the click carries a pending state through the redirect.

  The busy indicator lives on the trigger, not the menu item: clicking a menu item closes the
  popup at once, so a spinner on it would vanish before the redirect landed. The trigger is
  the one control still on screen during the round trip — it swaps its name for "Signing
  out…", its chevron for a spinner, and disables so the menu can't be reopened mid-flight.

  Imported from `@/components/auth/actions` directly, not the barrel: the barrel deliberately
  omits the `'use server'` module so it is not pulled into every client graph.
*/
export function AccountMenu({ name, roleLabel, initials, accentClassName, signOutLabel, signingOutLabel }: AccountMenuProps) {
  const [isSigningOut, startSignOut] = useTransition();

  const handleSignOutClick = (): void => {
    startSignOut(() => signOutAction());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2 px-2" aria-busy={isSigningOut} disabled={isSigningOut} />}>
        <Avatar className="size-6">
          <AvatarFallback className="text-[0.625rem]">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{isSigningOut ? signingOutLabel : name}</span>
        {isSigningOut ? <Spinner className="size-4" /> : <ChevronDown className="text-muted-foreground size-4" />}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-foreground truncate text-sm font-medium">{name}</span>
          <span className={cn('text-xs font-medium', accentClassName)}>{roleLabel}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuLinkItem render={<Link href={ROUTES.PROFILE.HREF} />}>
          <UserRound />
          Profile
        </DropdownMenuLinkItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={handleSignOutClick}>
          <LogOut />
          {signOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
