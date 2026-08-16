import type { Metadata, Viewport } from 'next';

import { Inter, Poppins } from 'next/font/google';

import { APP_DATA } from '@/constants';

import { cn } from '@/lib/utils';

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

export const metadata: Metadata = {
  title: APP_DATA.NAME,
  description: APP_DATA.DESCRIPTION,
  authors: [{ name: APP_DATA.NAME }],
  /*
    Nothing is indexed until a deployment opts in. Step 2 moves this onto the validated
    `ROBOTS_ENABLED` flag and gives it a second, independent signal in `robots.ts`; until
    then the safe answer is the only answer.
  */
  robots: {
    index: false,
    follow: false,
  },
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

        {children}
      </body>
    </html>
  );
}
