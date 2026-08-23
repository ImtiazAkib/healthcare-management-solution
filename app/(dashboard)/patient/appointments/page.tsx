import type { Metadata } from 'next';

import Link from 'next/link';

import { CalendarPlus } from 'lucide-react';

import { USER_ROLES } from '@/constants';

import { ROUTES } from '@/constants/routes.const';

import { requireRole } from '@/lib/auth';
import { PatientPortalService } from '@/lib/services';

import { PatientAppointments } from '@/components/patient';
import { Button, PageHeader } from '@/components/ui';

const portalService = new PatientPortalService();

export const metadata: Metadata = {
  title: 'My appointments',
  robots: { index: false, follow: false },
};

export default async function PatientAppointmentsPage() {
  // The patient is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  const appointments = await portalService.listMyAppointments(sessionUser);

  if (!appointments.success) {
    throw new Error('Could not load your appointments. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My appointments"
        description="Every visit you have booked, newest first. Book a new one, or see where an existing one stands."
        actions={
          <Button nativeButton={false} render={<Link href={ROUTES.PATIENT_APPOINTMENTS_NEW.HREF} />}>
            <CalendarPlus className="size-4" />
            Book an appointment
          </Button>
        }
      />

      <PatientAppointments appointments={appointments.result} />
    </div>
  );
}
