import type { Metadata } from 'next';

import { Stethoscope } from 'lucide-react';

import { CODES, USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { DoctorService, PrescriptionService } from '@/lib/services';

import { PrescriptionsEmpty, PrescriptionsTable } from '@/components/prescriptions';
import { EmptyState, PageHeader } from '@/components/ui';

const doctorService = new DoctorService();
const prescriptionService = new PrescriptionService();

export const metadata: Metadata = {
  title: 'Prescriptions',
  robots: { index: false, follow: false },
};

export default async function DoctorPrescriptionsPage() {
  // The doctor's own record is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const doctor = await doctorService.findByUser(sessionUser.userId);

  /*
    A doctor account with no professional record yet is a normal early state, not an error — the
    record is set up by an administrator in a separate flow — so it renders an empty state. Only a
    genuine "not found" shows it; any other failure is thrown to the error boundary rather than
    telling a doctor with scripts that they have none.
  */
  if (!doctor.result) {
    if (doctor.errors[0]?.code !== CODES.VALIDATION.COMMON.RESOURCE_NOT_FOUND.CODE) {
      throw new Error('Could not load your prescriptions. Please try again.');
    }

    return (
      <EmptyState
        icon={Stethoscope}
        title="No doctor profile yet"
        description="An administrator sets up your professional record. Once it exists, the prescriptions you write appear here."
      />
    );
  }

  const list = await prescriptionService.listForDoctor(doctor.result.doctorId);

  if (!list.success) {
    throw new Error('Could not load your prescriptions. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Prescriptions" description="The prescriptions you have written, newest first. Open one to read or print it." />

      {list.result.length === 0 ? <PrescriptionsEmpty /> : <PrescriptionsTable rows={list.result} />}
    </div>
  );
}
