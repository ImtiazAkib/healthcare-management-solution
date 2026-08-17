import type { Metadata } from 'next';

import { requireAdminArea } from '@/lib/auth';

import { RoleHome } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminPage() {
  // `requireAdminArea`, not `requireRole(ADMIN)` — the super administrator owns this area too.
  const sessionUser = await requireAdminArea();

  return (
    <RoleHome
      sessionUser={sessionUser}
      summary="Run the hospital's record of itself — the people, the places and the prices the rest of the system reads from."
      capabilities={[
        'Create, approve, edit and deactivate staff accounts',
        'Manage departments and the priced service catalogue',
        'Register patients and issue medical record numbers',
        'Raise invoices, record payments and read the analytics',
        'Read the access trail of who opened which record',
      ]}
    />
  );
}
