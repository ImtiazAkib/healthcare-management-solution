import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { NoticeService } from '@/lib/services';

import { DashboardNotices, RoleHome } from '@/components/dashboard';

const noticeService = new NoticeService();

export const metadata: Metadata = { title: 'Doctor' };

export default async function DoctorPage() {
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const notices = await noticeService.listForRole(sessionUser);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <RoleHome
        sessionUser={sessionUser}
        summary="See the history before the consultation starts, and write down what happened during it."
        capabilities={[
          'Open the day’s queue and consult the patient in front of you',
          'Read a patient’s full clinical timeline',
          'Record diagnoses and treatment notes',
          'Issue digital prescriptions',
          'Order diagnostic tests and read the released results',
        ]}
      />

      <DashboardNotices result={notices} />
    </div>
  );
}
