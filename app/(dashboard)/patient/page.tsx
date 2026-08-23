import type { Metadata } from 'next';

import { UserCog } from 'lucide-react';

import { CODES, USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { PatientDashboard } from '@/components/patient';
import { EmptyState, PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'My health',
  robots: { index: false, follow: false },
};

export default async function PatientPage() {
  // The patient is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  const overview = await portalService.getOverview(sessionUser);

  /*
    A patient account whose clinical record has not been set up yet is a normal early state, not an
    error — the record is created by the desk in a separate flow — so it renders an empty state. Only
    that specific "no record yet" shows it; any other failure is thrown to the error boundary rather
    than telling a patient with a record that they have none.
  */
  if (!overview.result) {
    if (overview.errors[0]?.code !== CODES.VALIDATION.PORTAL.PATIENT_PROFILE_NOT_FOUND.CODE) {
      throw new Error('Could not load your dashboard. Please try again.');
    }

    return (
      <EmptyState
        icon={UserCog}
        title="Your record is being set up"
        description="Once the desk finishes registering you, your appointments, prescriptions and results appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My health"
        description="Your own record, resolved from your account — your appointments, visits, prescriptions and results."
      />

      <PatientDashboard overview={overview.result} />
    </div>
  );
}
