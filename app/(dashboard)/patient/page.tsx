import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleHome } from '@/components/dashboard';

export const metadata: Metadata = { title: 'My health' };

export default async function PatientPage() {
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  return (
    <RoleHome
      sessionUser={sessionUser}
      summary="Your own record, and nobody else's — resolved from your account, never from a link somebody could change."
      capabilities={[
        'Book, reschedule and cancel your appointments',
        'Read your prescriptions and released test results',
        'Follow your own visit history',
        'See your invoices and what is still owed',
      ]}
    />
  );
}
