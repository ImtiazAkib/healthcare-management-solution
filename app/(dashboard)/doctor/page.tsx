import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleAreaPlaceholder } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Doctor' };

export default async function DoctorPage() {
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  return (
    <RoleAreaPlaceholder sessionUser={sessionUser} description="Today's queue, patient timelines, consultations, prescriptions and lab orders." />
  );
}
