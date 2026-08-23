import type { Metadata } from 'next';

import Link from 'next/link';

import { Megaphone } from 'lucide-react';

import { DEPARTMENT_STATUS_FILTERS } from '@/constants';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';
import { DepartmentFiltersSchema } from '@/lib/schemas';
import { DepartmentService, NoticeService } from '@/lib/services';

import { NoticeList, type NoticeDepartmentOption } from '@/components/notices';
import { Button, PageHeader } from '@/components/ui';

const noticeService = new NoticeService();
const departmentService = new DepartmentService();

export const metadata: Metadata = {
  title: 'Notices',
  robots: { index: false, follow: false },
};

export default async function AdminNoticesPage() {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  // Every notice, and the active departments an edit dialog needs to re-target a department notice.
  const [notices, departments] = await Promise.all([
    noticeService.list(),
    departmentService.list(DepartmentFiltersSchema.parse({ status: DEPARTMENT_STATUS_FILTERS.ACTIVE })),
  ]);

  // A failed read is thrown, not shown as an empty list — an unreachable database is not "no notices".
  if (!notices.success) {
    throw new Error('Could not load notices. Please try again.');
  }

  // A department lookup that failed leaves the edit dialogs with no options rather than breaking the page.
  const departmentOptions: NoticeDepartmentOption[] = departments.success
    ? departments.result.map(department => ({ id: department.departmentId, name: department.name }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notices"
        description="Every announcement across the hospital. Publish a new one, or amend and remove the ones already out."
        actions={
          <Button nativeButton={false} render={<Link href={ROUTES.ADMIN_NOTICES_NEW.HREF} />}>
            <Megaphone className="size-4" />
            Publish a notice
          </Button>
        }
      />

      <NoticeList notices={notices.result} admin departments={departmentOptions} />
    </div>
  );
}
