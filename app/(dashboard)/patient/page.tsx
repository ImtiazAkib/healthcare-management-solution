import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleAreaPlaceholder } from '@/components/dashboard';

export const metadata: Metadata = { title: 'My health' };

export default async function PatientPage() {
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  return (
    <RoleAreaPlaceholder
      sessionUser={sessionUser}
      description="Your appointments, prescriptions, released results and invoices — and nobody else's."
    />
  );
}
