import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { USER_ROLES } from '@/constants/roles.const';
import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';

import { UserCreateForm } from '@/components/admin/users';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Add a staff account',
  robots: { index: false, follow: false },
};

export default async function AdminUsersNewPage() {
  const sessionUser = await requireAdminArea();

  const isSuperAdmin = sessionUser.role === USER_ROLES.SUPER_ADMIN;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_USERS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to staff accounts
      </Link>

      <PageHeader
        title="Add a staff account"
        description={
          isSuperAdmin
            ? 'Create an administrator. The account is active and approved immediately, and signs in with the email and password you set.'
            : 'Create a doctor, nurse or lab account. It is active and approved immediately, and signs in with the email and password you set.'
        }
      />

      <UserCreateForm viewer={{ userId: sessionUser.userId, isSuperAdmin }} />
    </div>
  );
}
