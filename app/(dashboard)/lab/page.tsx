import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';

import { RoleHome } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Diagnostic lab' };

export default async function LabPage() {
  const sessionUser = await requireRole(USER_ROLES.LAB);

  return (
    <RoleHome
      sessionUser={sessionUser}
      summary="Take the order, do the work, and release the result once it has been verified — never before."
      capabilities={[
        'Work the incoming order list, most urgent first',
        'Upload reports as PDF or image',
        'Verify a result before it is released',
        'Bill the diagnostic services performed',
      ]}
    />
  );
}
