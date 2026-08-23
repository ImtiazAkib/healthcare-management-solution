import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { USER_ROLES } from '@/constants';

import { ROUTES } from '@/constants/routes.const';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { PatientBookForm } from '@/components/appointments';
import { PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'Book an appointment',
  robots: { index: false, follow: false },
};

export default async function PatientAppointmentsNewPage() {
  // The patient is resolved from the session's user id — the booking is pinned to them, never to a URL.
  await requireRole(USER_ROLES.PATIENT);

  const directory = await portalService.listDoctorDirectory();

  if (!directory.success) {
    throw new Error('Could not load the doctors. Please try again.');
  }

  const doctors = directory.result.map(doctor => ({
    doctorId: doctor.doctorId,
    name: doctor.name,
    specialization: doctor.specialization,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.PATIENT_APPOINTMENTS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to appointments
      </Link>

      <PageHeader
        title="Book an appointment"
        description="Pick a doctor, then choose a free slot from their published hours. A slot already taken is refused."
      />

      <PatientBookForm doctors={doctors} />
    </div>
  );
}
