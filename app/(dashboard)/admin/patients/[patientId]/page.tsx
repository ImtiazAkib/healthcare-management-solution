import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';
import { PatientService } from '@/lib/services';

import { PatientSummary } from '@/components/patients';

const patientService = new PatientService();

export const metadata: Metadata = {
  title: 'Patient record',
  robots: { index: false, follow: false },
};

type AdminPatientDetailPageProps = {
  params: Promise<{ patientId: string }>;
};

export default async function AdminPatientDetailPage({ params }: AdminPatientDetailPageProps) {
  await requireAdminArea();

  const { patientId } = await params;

  const result = await patientService.getDetail(patientId);

  // A missing record (or one whose account has gone) is a 404 rather than an empty page.
  if (!result.result) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_PATIENTS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>

      <PatientSummary patient={result.result} />
    </div>
  );
}
