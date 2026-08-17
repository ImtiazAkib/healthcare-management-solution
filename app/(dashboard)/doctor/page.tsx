import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleHome } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Doctor' };

export default async function DoctorPage() {
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  return (
    <RoleHome
      sessionUser={sessionUser}
      summary="See the history before the consultation starts, and write down what happened during it."
      capabilities={[
        'Open the day’s queue and consult the patient in front of you',
        'Read a patient’s full clinical timeline',
        'Record diagnoses and treatment notes',
        'Issue digital prescriptions',
        'Order diagnostic tests and read the released results',
      ]}
    />
  );
}
