import type { Metadata } from 'next';

import { MAIN_CONTENT_ID } from '@/constants/a11y.const';

import { requireSession } from '@/lib/auth';
import { resolveInitials, resolveRoleLabel, roleAccentClassName } from '@/lib/utils';

import { DashboardSidebar, DashboardTopbar } from '@/components/dashboard';
import { Toaster } from '@/components/shared';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

/*
  Two independent signals keeping the clinical surface out of search results: this metadata,
  and the `Disallow` entries `robots.ts` derives from `PROTECTED_SEGMENTS`. Either alone can
  fail — a metadata block refactored away, a robots file a crawler ignores — and a hospital
  system in a search index is not a mistake you can take back.
*/
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The shell every signed-in area sits in: a sidebar on `lg`, a topbar with the mobile drawer
 * and account menu below it, and the scrolling main region.
 *
 * The session is established once here and the identity is derived once, then handed to the
 * sidebar and topbar as one `user` object rather than as a scatter of props. The guard is on
 * this layout **and** on each page, so a route added under this group is protected before
 * anybody remembers to protect it — and so the page can still name the exact role it needs.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const sessionUser = await requireSession();

  const user = {
    name: sessionUser.name,
    roleLabel: resolveRoleLabel(sessionUser.role),
    initials: resolveInitials(sessionUser.name),
    accentClassName: roleAccentClassName(sessionUser.role),
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
      <DashboardSidebar role={sessionUser.role} navAriaLabel="Main navigation" user={user} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopbar role={sessionUser.role} user={user} />

        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mounted once for the whole dashboard, so an action can confirm itself from anywhere underneath. */}
      <Toaster />
    </div>
  );
}
