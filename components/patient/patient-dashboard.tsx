import Link from 'next/link';

import { ArrowRight, CalendarDays, CalendarPlus, FileText, FlaskConical, Pill } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { formatLongDate } from '@/lib/utils';

import { AppointmentStatusBadge } from '@/components/appointments';
import { Button } from '@/components/ui';

import type { PatientDashboardProps } from './patient.types';

/*
  The portal home: a hero for the next visit ahead — or an invitation to book when there is none —
  and a row of quick links into each area, each carrying the count that sits behind it so the record
  can be gauged at a glance before any one area is opened.
*/
export function PatientDashboard({ overview }: PatientDashboardProps) {
  const { patient, nextAppointment, upcomingCount, prescriptionCount, reportCount } = overview;

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-card-title">Your next appointment</h2>
          <p className="text-muted-foreground text-sm">Resolved from your account — your record alone, never a link somebody could change.</p>
        </div>

        {nextAppointment ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{formatLongDate(nextAppointment.date)}</span>
              <span className="text-muted-foreground">
                {nextAppointment.startTime}–{nextAppointment.endTime}
              </span>
              <AppointmentStatusBadge status={nextAppointment.status} />
            </div>

            <p className="text-muted-foreground text-sm">
              {nextAppointment.doctorName} · {nextAppointment.departmentName}
            </p>

            <div>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={ROUTES.PATIENT_APPOINTMENTS.HREF} />}>
                View all appointments
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">You have no upcoming appointments.</p>
            <div>
              <Button nativeButton={false} render={<Link href={ROUTES.PATIENT_APPOINTMENTS_NEW.HREF} />}>
                <CalendarPlus className="size-4" />
                Book an appointment
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={ROUTES.PATIENT_APPOINTMENTS.HREF}
          className="border-border hover:bg-muted/50 group flex flex-col gap-3 rounded-lg border p-4 transition-colors">
          <CalendarDays className="text-muted-foreground size-5" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-semibold">{upcomingCount}</span>
            <span className="text-muted-foreground text-sm">Upcoming appointments</span>
          </div>
        </Link>

        <Link
          href={ROUTES.PATIENT_RECORDS.HREF}
          className="border-border hover:bg-muted/50 group flex flex-col gap-3 rounded-lg border p-4 transition-colors">
          <FileText className="text-muted-foreground size-5" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-semibold">Visit history</span>
            <span className="text-muted-foreground text-sm">Your completed visits</span>
          </div>
        </Link>

        <Link
          href={ROUTES.PATIENT_PRESCRIPTIONS.HREF}
          className="border-border hover:bg-muted/50 group flex flex-col gap-3 rounded-lg border p-4 transition-colors">
          <Pill className="text-muted-foreground size-5" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-semibold">{prescriptionCount}</span>
            <span className="text-muted-foreground text-sm">Prescriptions</span>
          </div>
        </Link>

        <Link
          href={ROUTES.PATIENT_REPORTS.HREF}
          className="border-border hover:bg-muted/50 group flex flex-col gap-3 rounded-lg border p-4 transition-colors">
          <FlaskConical className="text-muted-foreground size-5" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-semibold">{reportCount}</span>
            <span className="text-muted-foreground text-sm">Test results</span>
          </div>
        </Link>
      </div>

      <p className="sr-only">Record number {patient.medicalRecordNo}.</p>
    </div>
  );
}
