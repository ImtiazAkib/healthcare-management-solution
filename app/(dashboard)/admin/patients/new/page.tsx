import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';

import { PatientCreateForm } from '@/components/patients';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Register a patient',
  robots: { index: false, follow: false },
};

export default async function AdminPatientsNewPage() {
  await requireAdminArea();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_PATIENTS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>

      <PageHeader
        title="Register a patient"
        description="Create the record and issue a medical record number. The patient claims the account later by proving their email; until then the record exists and staff can use it."
      />

      <PatientCreateForm />
    </div>
  );
}
