import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';
import { DepartmentService } from '@/lib/services';

import { DepartmentCreateForm } from '@/components/admin/departments';
import { PageHeader } from '@/components/ui';

const departmentService = new DepartmentService();

export const metadata: Metadata = {
  title: 'Add a department',
  robots: { index: false, follow: false },
};

export default async function AdminDepartmentsNewPage() {
  await requireAdminArea();

  const headOptions = await departmentService.listAssignableHeadDoctors();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_DEPARTMENTS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to departments
      </Link>

      <PageHeader
        title="Add a department"
        description="Create a department and, if you like, assign the doctor who heads it. Both can be changed later."
      />

      <DepartmentCreateForm headOptions={headOptions.result} />
    </div>
  );
}
