import Link from 'next/link';

import { APP_DATA, ROUTES } from '@/constants';

import { MAIN_CONTENT_ID } from '@/constants/a11y.const';

import { AppLogo, Container } from '@/components/shared';

type AuthLayoutProps = {
  children: React.ReactNode;
};

/*
  Its own group with neither the marketing header nor the dashboard shell: somebody signing
  in has one thing to do, and the navigation they would get from either is either irrelevant
  or not theirs yet. The brand stays, so the page is clearly this hospital's.
*/
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border border-b">
        <Container className="flex h-16 items-center">
          <Link href={ROUTES.HOME.HREF} className="flex items-center gap-2.5">
            <AppLogo className="size-9" />
            <span className="font-heading text-regular-bold tracking-tight">{APP_DATA.SHORT_NAME}</span>
          </Link>
        </Container>
      </header>

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex flex-1 items-center">
        {children}
      </main>
    </div>
  );
}
