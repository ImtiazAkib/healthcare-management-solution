import Link from 'next/link';

import { ROUTES } from '@/constants';

import { Container } from '@/components/shared';
import { Button } from '@/components/ui';

/*
  Outside the `(marketing)` group on purpose: an unmatched path has no route group, so a
  404 nested inside the marketing chrome would only render for paths that happened to be
  near it. This one answers for every miss.
*/
export default function NotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
      <span className="text-primary text-6xl font-semibold tabular-nums sm:text-7xl">404</span>

      <div className="flex flex-col gap-2">
        <h1>This page does not exist</h1>
        <p className="text-medium-normal text-muted-foreground max-w-xl">
          The address may have been mistyped, or the page may have moved since the link was written.
        </p>
      </div>

      <Button variant="default" size="lg" nativeButton={false} render={<Link href={ROUTES.HOME.HREF} />}>
        Back to the home page
      </Button>
    </Container>
  );
}
