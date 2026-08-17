import { USER_ROLE_LABELS } from '@/constants';

import { SignOutButton } from '@/components/auth';
import { Container } from '@/components/shared';

import type { SessionUser } from '@/types';

type RoleAreaPlaceholderProps = {
  sessionUser: SessionUser;
  description: string;
};

/**
 * The stand-in every role area renders until step 5 builds the real shell.
 *
 * It exists so the guards in step 4 can be exercised end to end — sign in, land in your own
 * area, be refused somebody else's — rather than being asserted against pages that do not
 * exist yet. One component rather than five near-identical pages, so replacing it is one
 * deletion.
 */
export function RoleAreaPlaceholder({ sessionUser, description }: RoleAreaPlaceholderProps) {
  return (
    <Container className="section-py flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2">
        <span className="tagline text-primary">{USER_ROLE_LABELS[sessionUser.role]}</span>
        <h1>Welcome, {sessionUser.name}</h1>
        <p className="text-medium-normal text-muted-foreground max-w-2xl">{description}</p>
      </div>

      <p className="text-muted-foreground text-sm">
        Signed in as {sessionUser.email}. This area gets its sidebar, navigation and dashboard in step 5.
      </p>

      <SignOutButton />
    </Container>
  );
}
