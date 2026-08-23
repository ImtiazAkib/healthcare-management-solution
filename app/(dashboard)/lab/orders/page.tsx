import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { LabService } from '@/lib/services';

import { LabOrdersEmpty, LabWorkList } from '@/components/lab';
import { PageHeader } from '@/components/ui';

const labService = new LabService();

export const metadata: Metadata = {
  title: 'Lab work list',
  robots: { index: false, follow: false },
};

export default async function LabWorkListPage() {
  await requireRole(USER_ROLES.LAB);

  const work = await labService.getWorkList();

  if (!work.success) {
    throw new Error('Could not load the lab work list. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Lab work list" description="The orders waiting on the lab, most urgent first. Work each along to a released report." />

      {work.result.length === 0 ? <LabOrdersEmpty /> : <LabWorkList orders={work.result} />}
    </div>
  );
}
