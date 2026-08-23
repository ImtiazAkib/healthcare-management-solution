import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { NoticeService } from '@/lib/services';

import { DashboardNotices, RoleHome } from '@/components/dashboard';

const noticeService = new NoticeService();

export const metadata: Metadata = { title: 'Diagnostic lab' };

export default async function LabPage() {
  const sessionUser = await requireRole(USER_ROLES.LAB);

  const notices = await noticeService.listForRole(sessionUser);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <RoleHome
        sessionUser={sessionUser}
        summary="Take the order, do the work, and release the result once it has been verified — never before."
        capabilities={[
          'Work the incoming order list, most urgent first',
          'Upload reports as PDF or image',
          'Verify a result before it is released',
          'Bill the diagnostic services performed',
        ]}
      />

      <DashboardNotices result={notices} />
    </div>
  );
}
