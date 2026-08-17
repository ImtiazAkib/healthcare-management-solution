import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleHome } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Nurse' };

export default async function NursePage() {
  const sessionUser = await requireRole(USER_ROLES.NURSE);

  return (
    <RoleHome
      sessionUser={sessionUser}
      summary="Own the first five minutes of a visit — check-in, vitals and the triage priority that reorders the queue."
      capabilities={[
        'Check patients in and assign their queue token',
        'Record vitals, with each reading range-checked',
        'Set the triage priority that moves urgent cases up the line',
        'Register a patient at the counter when reception is busy',
      ]}
    />
  );
}
