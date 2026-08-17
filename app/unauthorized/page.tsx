import type { Metadata } from 'next';

import Link from 'next/link';

import { ROLE_HOME, USER_ROLE_LABELS } from '@/constants';

import { requireSession } from '@/lib/auth';

import { SignOutButton } from '@/components/auth';
import { Container } from '@/components/shared';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Not allowed',
  robots: { index: false, follow: false },
};

/*
  Outside every route group, and behind `requireSession()`.

  It is the answer to "you are signed in and still may not be here" — so a visitor with no
  session gets sent to sign in instead of being told about an area they cannot see. And it
  offers the way back to their **own** area rather than a dead end, because the usual reason
  somebody lands here is a stale bookmark.
*/
export default async function UnauthorizedPage() {
  const sessionUser = await requireSession();

  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
      <span className="text-destructive text-6xl font-semibold tabular-nums sm:text-7xl">403</span>

      <div className="flex flex-col gap-2">
        <h1>This area is not yours</h1>
        <p className="text-medium-normal text-muted-foreground max-w-xl">
          You are signed in as {sessionUser.name} ({USER_ROLE_LABELS[sessionUser.role]}), and that role does not open this part of the system.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="default" size="lg" nativeButton={false} render={<Link href={ROLE_HOME[sessionUser.role]} />}>
          Go to my area
        </Button>

        <SignOutButton />
      </div>
    </Container>
  );
}
