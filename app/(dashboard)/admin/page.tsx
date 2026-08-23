import type { Metadata } from 'next';

import { requireAdminArea } from '@/lib/auth';
import { NoticeService } from '@/lib/services';

import { DashboardNotices, RoleHome } from '@/components/dashboard';

const noticeService = new NoticeService();

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminPage() {
  // `requireAdminArea`, not `requireRole(ADMIN)` — the super administrator owns this area too.
  const sessionUser = await requireAdminArea();

  const notices = await noticeService.listForRole(sessionUser);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <RoleHome
        sessionUser={sessionUser}
        summary="Run the hospital's record of itself — the people, the places and the prices the rest of the system reads from."
        capabilities={[
          'Create, approve, edit and deactivate staff accounts',
          'Manage departments and the priced service catalogue',
          'Register patients and issue medical record numbers',
          'Raise invoices, record payments and read the analytics',
          'Read the access trail of who opened which record',
        ]}
      />

      <DashboardNotices result={notices} />
    </div>
  );
}
