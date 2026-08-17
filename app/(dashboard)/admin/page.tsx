import type { Metadata } from 'next';

import { requireAdminArea } from '@/lib/auth';

import { RoleAreaPlaceholder } from '@/components/dashboard';

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminPage() {
  // `requireAdminArea`, not `requireRole(ADMIN)` — the super administrator owns this area too.
  const sessionUser = await requireAdminArea();

  return (
    <RoleAreaPlaceholder sessionUser={sessionUser} description="Staff accounts, departments, the service catalogue, billing and the access trail." />
  );
}
