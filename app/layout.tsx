import type { Metadata, Viewport } from 'next';

import { Inter, Poppins } from 'next/font/google';

import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { APP_DATA, SEO } from '@/constants';
import { env } from '@/env/server';

import { buildAbsoluteUrl, cn } from '@/lib/utils';

import { SkipToContent } from '@/components/shared';

import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

type RootLayoutProps = {
  children: React.ReactNode;
};

/*
  Static rather than `generateMetadata`: with one language and no dynamic segment there is
  nothing to await. `metadataBase` is what makes the canonical link, the OG URL and the
  social card resolve as absolute instead of silently rendering relative.
*/
export const metadata: Metadata = {
  metadataBase: new URL(env.APP_BASE_URL),
  title: APP_DATA.NAME,
  description: APP_DATA.DESCRIPTION,
  keywords: [...SEO.KEYWORDS],
  alternates: {
    canonical: buildAbsoluteUrl(env.APP_BASE_URL),
  },
  openGraph: {
    type: 'website',
    siteName: APP_DATA.SHORT_NAME,
    url: buildAbsoluteUrl(env.APP_BASE_URL),
    title: APP_DATA.NAME,
    description: APP_DATA.DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_DATA.NAME,
    description: APP_DATA.DESCRIPTION,
  },
  // Matches robots.txt: a deployment that has not opted into indexing says so twice.
  robots: {
    index: env.ROBOTS_ENABLED,
    follow: env.ROBOTS_ENABLED,
  },
  authors: [{ name: APP_DATA.NAME }],
};

/*
  Browser-chrome color, matched to the app background in each scheme — the sRGB of
  `--background` light and dark, so a mobile address bar meets the page seamlessly.
*/
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7fbfc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0e11' },
  ],
};

/*
  The root layout carries the document, nothing else. Page chrome belongs to the route
  groups — `(marketing)` has the site header and footer, `(dashboard)` will have the
  sidebar, `(auth)` neither — because a dashboard nested inside the marketing header would
  inherit navigation it has no use for.
*/
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    /*
      The font variables sit on <html>, not <body>. `--font-body` is declared on <html> too,
      and a custom property resolves against the element that declares it — so if the faces
      were declared one level down, the indirection in globals.css would resolve to nothing.
    */
    <html lang="en" data-scroll-behavior="smooth" className={cn(inter.variable, poppins.variable)}>
      <body className="font-sans antialiased">
        {/* First in the tab order, before anything else, so it is reachable on the first press of Tab. */}
        <SkipToContent />

        {/*
          nuqs reads and writes the URL query string, which is how the admin filter bars keep
          their state shareable and reload-proof. The adapter wraps the whole app so any route
          may use the hooks; it renders nothing.
        */}
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
