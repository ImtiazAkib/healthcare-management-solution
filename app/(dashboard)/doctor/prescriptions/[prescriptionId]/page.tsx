import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { ROUTES, USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { EncounterService, PrescriptionService } from '@/lib/services';

import { PrescriptionScreen } from '@/components/prescriptions';

const prescriptionService = new PrescriptionService();
const encounterService = new EncounterService();

export const metadata: Metadata = {
  title: 'Prescription',
  robots: { index: false, follow: false },
};

type DoctorPrescriptionPageProps = {
  params: Promise<{ prescriptionId: string }>;
};

export default async function DoctorPrescriptionPage({ params }: DoctorPrescriptionPageProps) {
  // The doctor is resolved from the session; the prescription's access is checked by relationship.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const { prescriptionId } = await params;

  const detail = await prescriptionService.getDetail(prescriptionId);

  if (!detail.result) {
    notFound();
  }

  /*
    A prescription is readable only by a doctor who may read its encounter — the same relationship
    gate the encounter itself enforces. A missing prescription, or one hanging off a stranger's
    encounter, is a 404: a doctor guessing the id is shown a not-found, never told the record exists.
  */
  const access = await encounterService.getById(detail.result.encounterId, sessionUser);

  if (!access.result) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={ROUTES.DOCTOR_PRESCRIPTIONS.HREF}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-4" />
        Prescriptions
      </Link>

      <PrescriptionScreen prescription={detail.result} />
    </div>
  );
}
