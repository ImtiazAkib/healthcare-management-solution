import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { AppointmentService, EncounterService, LabService, MedicalRecordService, PrescriptionService } from '@/lib/services';

import { EncounterScreen } from '@/components/encounters';

const encounterService = new EncounterService();
const appointmentService = new AppointmentService();
const medicalRecordService = new MedicalRecordService();
const prescriptionService = new PrescriptionService();
const labService = new LabService();

export const metadata: Metadata = {
  title: 'Encounter',
  robots: { index: false, follow: false },
};

type DoctorEncounterPageProps = {
  params: Promise<{ encounterId: string }>;
};

export default async function DoctorEncounterPage({ params }: DoctorEncounterPageProps) {
  // The doctor is resolved from the session; the encounter's access is checked by relationship.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const { encounterId } = await params;

  const encounter = await encounterService.getDetail(encounterId, sessionUser);

  /*
    An encounter is reachable only by a doctor related to its patient. A missing encounter, or one
    belonging to a stranger's patient, is a 404 — a doctor guessing the URL is shown a not-found,
    never told the record exists.
  */
  if (!encounter.result) {
    notFound();
  }

  // The vitals live on the appointment — a nurse records them at check-in, before the encounter
  // opened — so they are read from there and shown read-only beside the consultation.
  const appointment = await appointmentService.getById(encounter.result.appointmentId);
  const vitals = appointment.result?.vitals ?? null;

  // The header names the patient. Read through the same relationship-checked path as the record.
  const patient = await medicalRecordService.getPatientForDoctor(encounter.result.patientId, sessionUser);
  const patientName = patient.result?.name ?? 'Patient';

  // The scripts written in this encounter, shown beside the consultation and issued from it while open.
  const prescriptions = await prescriptionService.listForEncounter(encounter.result.encounterId);

  /*
    A failed read returns an empty list too — throw rather than show "no prescriptions written yet"
    for an encounter that has them, which on an open encounter would invite the doctor to issue a
    duplicate of a script that is already there.
  */
  if (!prescriptions.success) {
    throw new Error('Could not load the prescriptions for this encounter. Please try again.');
  }

  // The lab work ordered in this encounter, shown beside the consultation and ordered from it while open.
  const labOrders = await labService.listOrdersForEncounter(encounter.result.encounterId);

  if (!labOrders.success) {
    throw new Error('Could not load the lab orders for this encounter. Please try again.');
  }

  return (
    <EncounterScreen
      encounter={encounter.result}
      vitals={vitals}
      patientName={patientName}
      prescriptions={prescriptions.result}
      labOrders={labOrders.result}
    />
  );
}
