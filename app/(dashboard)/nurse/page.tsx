import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { NoticeService } from '@/lib/services';

import { DashboardNotices, RoleHome } from '@/components/dashboard';

const noticeService = new NoticeService();

export const metadata: Metadata = { title: 'Nurse' };

export default async function NursePage() {
  const sessionUser = await requireRole(USER_ROLES.NURSE);

  const notices = await noticeService.listForRole(sessionUser);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <RoleHome
        sessionUser={sessionUser}
        summary="Own the first five minutes of a visit — check-in, vitals and the triage priority that reorders the queue."
        capabilities={[
          'Check patients in and assign their queue token',
          'Record vitals, with each reading range-checked',
          'Set the triage priority that moves urgent cases up the line',
          'Register a patient at the counter when reception is busy',
        ]}
      />

      <DashboardNotices result={notices} />
    </div>
  );
}
