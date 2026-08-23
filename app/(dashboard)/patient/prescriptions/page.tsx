import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { PatientPrescriptions } from '@/components/patient';
import { PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'My prescriptions',
  robots: { index: false, follow: false },
};

export default async function PatientPrescriptionsPage() {
  // The patient is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  const prescriptions = await portalService.listMyPrescriptions(sessionUser);

  if (!prescriptions.success) {
    throw new Error('Could not load your prescriptions. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My prescriptions"
        description="Every prescription written for you, newest first. A replaced one is kept but marked, so the live instruction is clear."
      />

      <PatientPrescriptions prescriptions={prescriptions.result} />
    </div>
  );
}
