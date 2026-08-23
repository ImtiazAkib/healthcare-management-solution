import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { DoctorDirectory } from '@/components/patient';
import { PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'Find a doctor',
  robots: { index: false, follow: false },
};

export default async function PatientDoctorsPage() {
  // The directory is public to any signed-in patient — it carries nothing personal about a doctor.
  await requireRole(USER_ROLES.PATIENT);

  const directory = await portalService.listDoctorDirectory();

  if (!directory.success) {
    throw new Error('Could not load the doctors. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Find a doctor"
        description="The doctors you can book with, their departments and their sitting hours. Pick one to book a visit."
      />

      <DoctorDirectory doctors={directory.result} />
    </div>
  );
}
