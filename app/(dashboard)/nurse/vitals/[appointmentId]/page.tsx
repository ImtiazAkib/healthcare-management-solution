import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { AppointmentService, PatientService } from '@/lib/services';

import { VitalsScreen } from '@/components/vitals';

const appointmentService = new AppointmentService();
const patientService = new PatientService();

export const metadata: Metadata = {
  title: 'Record vitals',
  robots: { index: false, follow: false },
};

type NurseVitalsPageProps = {
  params: Promise<{ appointmentId: string }>;
};

export default async function NurseVitalsPage({ params }: NurseVitalsPageProps) {
  // A doctor, lab, patient or administrator who reaches this URL is sent to /unauthorized, not sign-in.
  await requireRole(USER_ROLES.NURSE);

  const { appointmentId } = await params;

  const appointment = await appointmentService.getById(appointmentId);

  // A missing appointment is a 404 — a nurse guessing the URL is shown a not-found, never a shell.
  if (!appointment.result) {
    notFound();
  }

  // The header names the patient the vitals are recorded against; a missing account degrades to
  // placeholders rather than failing the whole screen.
  const patient = await patientService.getDetail(appointment.result.patientId);
  const patientName = patient.result?.name ?? 'Patient';
  const medicalRecordNo = patient.result?.medicalRecordNo ?? '—';

  return (
    <div className="flex flex-col gap-6">
      <Link href="/nurse/queue" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" />
        Back to the queue
      </Link>

      <VitalsScreen appointment={appointment.result} patientName={patientName} medicalRecordNo={medicalRecordNo} />
    </div>
  );
}
