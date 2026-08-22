import type { Metadata } from 'next';

import { CalendarDays, Stethoscope } from 'lucide-react';

import { USER_ROLES } from '@/constants';

import { FILTER_ALL } from '@/constants/users.const';

import { requireRole } from '@/lib/auth';
import { AppointmentService, DoctorService } from '@/lib/services';
import { formatShortDate, toCalendarDate } from '@/lib/utils';

import { AppointmentsTable } from '@/components/appointments';
import { EmptyState, PageHeader } from '@/components/ui';

const doctorService = new DoctorService();
const appointmentService = new AppointmentService();

export const metadata: Metadata = {
  title: 'My appointments',
  robots: { index: false, follow: false },
};

export default async function DoctorAppointmentsPage() {
  // The doctor's own record is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const doctor = await doctorService.findByUser(sessionUser.userId);

  /*
    A doctor account with no professional record yet is a normal early state, not an error — the
    record is set up by an administrator in a separate flow — so it renders an empty state rather
    than a booked-appointments list it cannot build.
  */
  if (!doctor.result) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No doctor profile yet"
        description="An administrator sets up your professional record. Once it exists, the appointments booked for you appear here."
      />
    );
  }

  /*
    Bounded to today, and to the doctor, so the list is a bounded day rather than an unbounded
    history that the service's page cap would silently trim from the wrong end — the day a doctor
    opens this page to see is today's, not the furthest-future booking.
  */
  const today = toCalendarDate();
  const appointments = await appointmentService.list({ doctorId: doctor.result.doctorId, date: today, status: FILTER_ALL });
  const total = appointments.resultInfo?.totalCount ?? appointments.result.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Today's appointments"
        description={`The patients booked with you on ${formatShortDate(today)}. Reception manages the bookings; your queue shows who has arrived.`}
      />

      {appointments.result.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments today"
          description="When reception books a patient into your published hours for today, the appointment appears here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AppointmentsTable rows={appointments.result} readOnly />
          {total > appointments.result.length && (
            <p role="status" className="text-muted-foreground text-sm">
              Showing {appointments.result.length} of {total} today.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
