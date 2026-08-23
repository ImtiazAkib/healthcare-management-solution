import type { Metadata } from 'next';

import { FlaskConical } from 'lucide-react';

import { CODES, USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { DoctorService, LabService } from '@/lib/services';

import { LabOrdersEmpty, LabOrdersTable } from '@/components/lab';
import { EmptyState, PageHeader } from '@/components/ui';

const doctorService = new DoctorService();
const labService = new LabService();

export const metadata: Metadata = {
  title: 'Lab orders',
  robots: { index: false, follow: false },
};

export default async function DoctorLabOrdersPage() {
  // The doctor's own record is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const doctor = await doctorService.findByUser(sessionUser.userId);

  /*
    A doctor account with no professional record yet is a normal early state, not an error — the
    record is set up by an administrator — so it renders an empty state. Only a genuine "not found"
    shows it; any other failure is thrown to the error boundary.
  */
  if (!doctor.result) {
    if (doctor.errors[0]?.code !== CODES.VALIDATION.COMMON.RESOURCE_NOT_FOUND.CODE) {
      throw new Error('Could not load your lab orders. Please try again.');
    }

    return (
      <EmptyState
        icon={FlaskConical}
        title="No doctor profile yet"
        description="An administrator sets up your professional record. Once it exists, the lab work you order appears here."
      />
    );
  }

  const orders = await labService.listOrdersForDoctor(doctor.result.doctorId);

  if (!orders.success) {
    throw new Error('Could not load your lab orders. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Lab orders" description="The lab work you have ordered, newest first. Open a released report to read it." />

      {orders.result.length === 0 ? <LabOrdersEmpty /> : <LabOrdersTable rows={orders.result} />}
    </div>
  );
}
