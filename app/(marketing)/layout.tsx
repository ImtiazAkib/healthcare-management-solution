import { MAIN_CONTENT_ID } from '@/constants/a11y.const';

import { SiteFooter, SiteHeader } from '@/components/layout';

type MarketingLayoutProps = {
  children: React.ReactNode;
};

/*
  The public face of the site: header and footer. Neither belongs on a signed-in dashboard,
  which is why this is a route group rather than part of the root layout. Step 2 adds the
  structured data that describes the same surface.
*/
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 pt-16">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
