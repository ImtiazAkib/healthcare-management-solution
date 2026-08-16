import { APP_DATA, buildJsonLdGraph } from '@/constants';
import { env } from '@/env/server';

import { MAIN_CONTENT_ID } from '@/constants/a11y.const';

import { SiteFooter, SiteHeader } from '@/components/layout';
import { JsonLd } from '@/components/shared';

type MarketingLayoutProps = {
  children: React.ReactNode;
};

/*
  The public face of the site: header, footer and the structured data that describes it.
  None of that belongs on a signed-in dashboard, which is why this is a route group rather
  than part of the root layout.
*/
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  const jsonLd = buildJsonLdGraph({ baseUrl: env.APP_BASE_URL, description: APP_DATA.DESCRIPTION });

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={jsonLd} />

      <SiteHeader />

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 pt-16">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
