'use client';

import { useTransition } from 'react';

import { LogOut } from 'lucide-react';

import { Button, Spinner } from '@/components/ui';

/*
  Imported from the module rather than `@/components/auth`: the barrel deliberately does not
  export `actions.ts`, because a `'use server'` module re-exported through a barrel that a
  client component imports pulls every action in it into that client's graph.
*/
import { signOutAction } from './actions';

export function SignOutButton() {
  const [isPending, startSignOut] = useTransition();

  const handleSignOutClick = (): void => {
    startSignOut(() => signOutAction());
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleSignOutClick}>
      {isPending ? <Spinner className="size-4" /> : <LogOut className="size-4" aria-hidden />}
      Sign out
    </Button>
  );
}
