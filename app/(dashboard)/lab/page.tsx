import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleAreaPlaceholder } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Diagnostic lab' };

export default async function LabPage() {
  const sessionUser = await requireRole(USER_ROLES.LAB);

  return (
    <RoleAreaPlaceholder
      sessionUser={sessionUser}
      description="The incoming order list, report uploads, and the verification that precedes a release."
    />
  );
}
