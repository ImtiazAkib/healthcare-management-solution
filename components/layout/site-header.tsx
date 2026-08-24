import Link from 'next/link';

import { APP_DATA, ROLE_HOME, ROUTES, SECTION_IDS } from '@/constants';

import { getSessionUser } from '@/lib/auth';

import { AppLogo, Container, ThemeSelector } from '@/components/shared';
import { Button } from '@/components/ui';

/*
  Reads the session so the landing page knows the visitor is already signed in. Without it
  the header only ever offered "Sign in", so somebody who closed the tab and came back was
  shown a sign-in button with no way to their own area — even though their session was still
  valid.

  Reading the cookie opts this route out of static generation, which is the right trade for a
  header that has to reflect who is looking at it. A crawler carries no cookie and still gets
  the public, signed-out version.
*/
export async function SiteHeader() {
  const sessionUser = await getSessionUser();

  return (
    <header className="bg-background/80 border-border fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md">
      {/*
        Gaps tighten below `sm` and the brand is allowed to shrink: at 375px a non-shrinking
        brand beside the action pushes the row past the viewport.
      */}
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href={ROUTES.HOME.HREF} className="flex min-w-0 items-center gap-2.5">
          <AppLogo className="size-9" />
          <span className="font-heading text-regular-bold truncate tracking-tight">{APP_DATA.SHORT_NAME}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <nav className="hidden items-center gap-6 md:flex">
            <a href={`#${SECTION_IDS.ROLES}`} className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              Roles
            </a>

            <a href={`#${SECTION_IDS.FEATURES}`} className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              Modules
            </a>

            <a href={`#${SECTION_IDS.STACK}`} className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              Stack
            </a>

            <a href={`#${SECTION_IDS.ROADMAP}`} className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              Roadmap
            </a>
          </nav>

          <ThemeSelector />

          {sessionUser ? (
            <Button variant="default" size="sm" nativeButton={false} render={<Link href={ROLE_HOME[sessionUser.role]} prefetch={false} />}>
              My area
            </Button>
          ) : (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={ROUTES.SIGN_IN.HREF} />}>
              Sign in
            </Button>
          )}
        </div>
      </Container>
    </header>
  );
}
