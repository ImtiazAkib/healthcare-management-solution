import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { PatientTimeline } from '@/components/patient';
import { PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'My records',
  robots: { index: false, follow: false },
};

export default async function PatientRecordsPage() {
  // The patient is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  const timeline = await portalService.getMyTimeline(sessionUser);

  if (!timeline.success) {
    throw new Error('Could not load your records. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My records" description="Your completed visits, newest first — the complaint each opened on and the diagnoses recorded." />

      <PatientTimeline entries={timeline.result} />
    </div>
  );
}
