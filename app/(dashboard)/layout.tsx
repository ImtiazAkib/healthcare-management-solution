import type { Metadata } from 'next';

import { MAIN_CONTENT_ID } from '@/constants/a11y.const';

import { requireSession } from '@/lib/auth';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

/*
  Two independent signals keeping the clinical surface out of search results: this metadata,
  and the `Disallow` entries `robots.ts` derives from `PROTECTED_SEGMENTS`. Either alone can
  fail — a metadata block that gets refactored away, a robots file a crawler ignores — and a
  hospital system in a search index is not a mistake you can take back.
*/
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The shell every signed-in area sits in.
 *
 * Deliberately thin for now: it establishes the session and the main landmark, and step 5
 * builds the sidebar, topbar and navigation on top of it. The guard is here as well as on
 * each page so a new route added under this group is protected before anybody remembers to
 * protect it.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1">
        {children}
      </main>
    </div>
  );
}
