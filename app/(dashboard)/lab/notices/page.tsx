import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { NoticeService } from '@/lib/services';

import { NoticeList } from '@/components/notices';
import { PageHeader } from '@/components/ui';

const noticeService = new NoticeService();

export const metadata: Metadata = {
  title: 'Notices',
  robots: { index: false, follow: false },
};

export default async function LabNoticesPage() {
  // The feed is built for whoever is signed in — targeting is the query, resolved from the session.
  const sessionUser = await requireRole(USER_ROLES.LAB);

  const notices = await noticeService.listForRole(sessionUser);

  // A failed read is thrown, not shown as an empty feed — an unreachable database is not "no notices".
  if (!notices.success) {
    throw new Error('Could not load notices. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notices"
        description="Hospital announcements aimed at the diagnostic lab and the wider staff. Anything marked an emergency is pinned to the top."
      />

      <NoticeList notices={notices.result} />
    </div>
  );
}
