import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleAreaPlaceholder } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Nurse' };

export default async function NursePage() {
  const sessionUser = await requireRole(USER_ROLES.NURSE);

  return <RoleAreaPlaceholder sessionUser={sessionUser} description="Check-in, vitals, triage priority and the queue as it actually stands." />;
}
