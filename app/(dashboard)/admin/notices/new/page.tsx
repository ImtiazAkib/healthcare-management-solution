import type { Metadata } from 'next';

import { DEPARTMENT_STATUS_FILTERS } from '@/constants';

import { requireAdminArea } from '@/lib/auth';
import { DepartmentFiltersSchema } from '@/lib/schemas';
import { DepartmentService } from '@/lib/services';

import { NoticeCreateForm, type NoticeDepartmentOption } from '@/components/notices';
import { PageHeader } from '@/components/ui';

const departmentService = new DepartmentService();

export const metadata: Metadata = {
  title: 'Publish a notice',
  robots: { index: false, follow: false },
};

export default async function AdminNoticeNewPage() {
  await requireAdminArea();

  // A department notice targets one department, so the form needs the active ones to choose from.
  const departments = await departmentService.list(DepartmentFiltersSchema.parse({ status: DEPARTMENT_STATUS_FILTERS.ACTIVE }));

  const departmentOptions: NoticeDepartmentOption[] = departments.success
    ? departments.result.map(department => ({ id: department.departmentId, name: department.name }))
    : [];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Publish a notice"
        description="Write an announcement and choose who sees it. An emergency pins to the top of every targeted dashboard."
      />

      <NoticeCreateForm departments={departmentOptions} />
    </div>
  );
}
