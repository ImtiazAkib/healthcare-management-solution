import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { EncounterService, PrescriptionService } from '@/lib/services';

import { PrescriptionPrintSheet } from '@/components/prescriptions';

const prescriptionService = new PrescriptionService();
const encounterService = new EncounterService();

export const metadata: Metadata = {
  title: 'Prescription',
  robots: { index: false, follow: false },
};

type DoctorPrescriptionPrintPageProps = {
  params: Promise<{ prescriptionId: string }>;
};

export default async function DoctorPrescriptionPrintPage({ params }: DoctorPrescriptionPrintPageProps) {
  // Same relationship gate as the detail page: readable only by a doctor who may read its encounter.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const { prescriptionId } = await params;

  const detail = await prescriptionService.getDetail(prescriptionId);

  if (!detail.result) {
    notFound();
  }

  const access = await encounterService.getById(detail.result.encounterId, sessionUser);

  if (!access.result) {
    notFound();
  }

  return <PrescriptionPrintSheet prescription={detail.result} />;
}
