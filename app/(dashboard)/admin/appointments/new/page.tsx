import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';
import { DoctorService, PatientService } from '@/lib/services';

import { AppointmentBookForm } from '@/components/appointments';
import { PageHeader } from '@/components/ui';

const doctorService = new DoctorService();
const patientService = new PatientService();

export const metadata: Metadata = {
  title: 'Book an appointment',
  robots: { index: false, follow: false },
};

export default async function AdminAppointmentsNewPage() {
  await requireAdminArea();

  const [doctorOptions, patients] = await Promise.all([doctorService.listForSelection(), patientService.list({ query: '' })]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_APPOINTMENTS.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to appointments
      </Link>

      <PageHeader
        title="Book an appointment"
        description="Pick the patient and the doctor, then choose a free slot from the doctor's published hours. A slot already taken is refused."
      />

      <AppointmentBookForm doctorOptions={doctorOptions.result} patientOptions={patients.result} />
    </div>
  );
}
