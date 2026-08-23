import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { USER_ROLES } from '@/constants';

import { ROUTES } from '@/constants/routes.const';

import { requireRole } from '@/lib/auth';
import { MedicalRecordService } from '@/lib/services';

import { PatientClinicalSummary } from '@/components/patients/patient-clinical-summary';

const medicalRecordService = new MedicalRecordService();

export const metadata: Metadata = {
  title: 'Patient record',
  robots: { index: false, follow: false },
};

type DoctorPatientDetailPageProps = {
  params: Promise<{ patientId: string }>;
};

export default async function DoctorPatientDetailPage({ params }: DoctorPatientDetailPageProps) {
  // The doctor's own record is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const { patientId } = await params;

  const detail = await medicalRecordService.getPatientForDoctor(patientId, sessionUser);

  /*
    A doctor reaches a record only through a patient they are related to. A missing record, or one
    this doctor has no relationship with, is a 404 — a doctor guessing the URL of a stranger's
    patient is shown a not-found, never told the record exists.
  */
  if (!detail.result) {
    notFound();
  }

  const timeline = await medicalRecordService.getPatientTimeline(patientId, sessionUser);

  /*
    A failed read returns an empty list too — throw rather than tell a doctor a patient with a
    history has none. The relationship was already proven by the detail read above, so this only
    fires on a genuine database failure, which belongs at the error boundary, not in an empty state.
  */
  if (!timeline.success) {
    throw new Error('Could not load this patient’s clinical timeline. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={ROUTES.DOCTOR_PATIENTS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>

      <PatientClinicalSummary patient={detail.result} timeline={timeline.result} />
    </div>
  );
}
