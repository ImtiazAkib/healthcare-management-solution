import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { PatientReports } from '@/components/patient';
import { PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'My test results',
  robots: { index: false, follow: false },
};

export default async function PatientReportsPage() {
  // The patient is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  const reports = await portalService.listMyReleasedReports(sessionUser);

  if (!reports.success) {
    throw new Error('Could not load your test results. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My test results"
        description="Results the lab has released to you, newest first. Open a report to read it, or download the file."
      />

      <PatientReports reports={reports.result} />
    </div>
  );
}
