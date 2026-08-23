import { CalendarDays } from 'lucide-react';

import { formatShortDate } from '@/lib/utils';

import { AppointmentStatusBadge } from '@/components/appointments';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import { PatientPortalEmpty } from './patient-portal-empty';

import type { PatientAppointmentsProps } from './patient.types';

/*
  The patient's own appointments, read-only: they book a visit and read where it stands, but the
  desk manages the booking once it is made, so there are no controls here — just the day, the time,
  who they are seeing and where it sits in its lifecycle.
*/
export function PatientAppointments({ appointments }: PatientAppointmentsProps) {
  if (appointments.length === 0) {
    return (
      <PatientPortalEmpty icon={CalendarDays} title="No appointments yet" description="Book a visit and it appears here, with where it stands." />
    );
  }

  return (
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="My appointments" className="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {appointments.map(appointment => (
            <TableRow key={appointment.appointmentId}>
              <TableCell className="whitespace-nowrap">{formatShortDate(appointment.date)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {appointment.startTime}–{appointment.endTime}
              </TableCell>
              <TableCell className="font-medium">{appointment.doctorName}</TableCell>
              <TableCell className="text-muted-foreground">{appointment.departmentName}</TableCell>
              <TableCell>
                <AppointmentStatusBadge status={appointment.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
