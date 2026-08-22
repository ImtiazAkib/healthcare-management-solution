'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, PageHeader } from '@/components/ui';

import { changeAppointmentStatusAction } from './actions';
import { AppointmentCancelDialog } from './appointment-cancel.dialog';
import { AppointmentRescheduleDialog } from './appointment-reschedule.dialog';
import { AppointmentsEmpty } from './appointments-empty';
import { AppointmentsFilters } from './appointments-filters';
import { AppointmentsTable } from './appointments-table';

import type { AppointmentRow, DoctorOption } from './appointments.types';

type AppointmentsScreenProps = {
  rows: AppointmentRow[];
  /** Total matching the filters, which can exceed the page — the table shows the first page. */
  total: number;
  doctorOptions: DoctorOption[];
  /** True when any filter is applied, so the empty state can tell "none yet" from "none match". */
  filtered: boolean;
};

/*
  The one client component on this screen. The table, the reschedule dialog and the cancel dialog
  share which row is selected and whether an action is in flight, so splitting that state across
  siblings would only mean lifting it back up again.

  Both mutations end in `router.refresh()`: the list is server-rendered, so re-running the server
  component is what makes the change appear — and it re-applies the current URL filters for free.
  The dialogs are keyed on the row's id and mounted only while a row is selected, so each opens
  clean rather than carrying the last attempt's values or error.
*/
export function AppointmentsScreen({ rows, total, doctorOptions, filtered }: AppointmentsScreenProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();

  const [rescheduling, setRescheduling] = useState<AppointmentRow | null>(null);
  const [cancelling, setCancelling] = useState<AppointmentRow | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // The page is capped; when more match than are shown, say so rather than hiding the rest silently.
  const isTruncated = total > rows.length;

  const handleReschedule = (appointment: AppointmentRow): void => {
    setRescheduling(appointment);
  };

  const handleRescheduled = (): void => {
    setRescheduling(null);
    toast.success('Appointment rescheduled.');
    router.refresh();
  };

  const handleReschedulingOpenChange = (open: boolean): void => {
    if (!open) {
      setRescheduling(null);
    }
  };

  const handleCancel = (appointment: AppointmentRow): void => {
    setCancelError(null);
    setCancelling(appointment);
  };

  const handleCancelConfirm = (cancelledReason: string): void => {
    if (!cancelling) {
      return;
    }

    const target = cancelling;

    startWorking(async () => {
      const result = await changeAppointmentStatusAction({
        appointmentId: target.appointmentId,
        status: APPOINTMENT_STATUSES.CANCELLED,
        cancelledReason,
      });

      if (!isSuccess(result)) {
        setCancelError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setCancelling(null);
      toast.success('Appointment cancelled.');
      router.refresh();
    });
  };

  const handleCancellingOpenChange = (open: boolean): void => {
    if (!open) {
      setCancelling(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description="Book at the counter against a doctor's published hours, and manage the day's list."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_APPOINTMENTS_NEW.HREF} />}>
            <CalendarPlus className="size-4" />
            Book an appointment
          </Button>
        }
      />

      <AppointmentsFilters doctorOptions={doctorOptions} />

      {rows.length === 0 ? (
        <AppointmentsEmpty filtered={filtered} />
      ) : (
        <div className="flex flex-col gap-2">
          <AppointmentsTable rows={rows} onReschedule={handleReschedule} onCancel={handleCancel} />
          {isTruncated && (
            <p role="status" className="text-muted-foreground text-sm">
              Showing {rows.length} of {total} appointments. Narrow the filters to see the rest.
            </p>
          )}
        </div>
      )}

      {rescheduling && (
        <AppointmentRescheduleDialog
          key={rescheduling.appointmentId}
          appointment={rescheduling}
          doctorOptions={doctorOptions}
          onRescheduled={handleRescheduled}
          onOpenChange={handleReschedulingOpenChange}
        />
      )}

      {cancelling && (
        <AppointmentCancelDialog
          key={cancelling.appointmentId}
          appointment={cancelling}
          isWorking={isWorking}
          error={cancelError}
          onConfirm={handleCancelConfirm}
          onOpenChange={handleCancellingOpenChange}
        />
      )}
    </div>
  );
}
