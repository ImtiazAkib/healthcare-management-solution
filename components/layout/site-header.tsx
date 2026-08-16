import Link from 'next/link';

import { APP_DATA, ROUTES, SECTION_IDS } from '@/constants';

import { AppLogo, Container } from '@/components/shared';
import { Button } from '@/components/ui';

/*
  No sign-in button yet: `typedRoutes` refuses a link to a route that does not exist, and
  `/sign-in` arrives with authentication in step 4. Until then the header's only call to
  action is the one anchor on the page.
*/
export function SiteHeader() {
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

          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`#${SECTION_IDS.ROLES}`} />}>
            Explore the roles
          </Button>
        </div>
      </Container>
    </header>
  );
}
