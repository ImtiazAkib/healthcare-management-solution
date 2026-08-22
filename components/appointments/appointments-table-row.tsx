import { CalendarClock, MoreHorizontal, Ban } from 'lucide-react';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';

import { formatShortDate } from '@/lib/utils';

import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, TableCell, TableRow } from '@/components/ui';

import { AppointmentStatusBadge } from './appointment-status.badge';

import type { AppointmentRow } from './appointments.types';

type AppointmentsTableRowProps = {
  appointment: AppointmentRow;
  /** The doctor's own list is read-only: no actions column is rendered for it. */
  readOnly: boolean;
  onReschedule: (appointment: AppointmentRow) => void;
  onCancel: (appointment: AppointmentRow) => void;
};

export function AppointmentsTableRow({ appointment, readOnly, onReschedule, onCancel }: AppointmentsTableRowProps) {
  /*
    Only a booking still ahead of the visit can be moved or called off. Once the patient has
    checked in, or the appointment has reached a terminal state, this row offers nothing — the
    service refuses those transitions regardless, so a control that could only produce a refusal
    is not rendered.
  */
  const canManage = appointment.status === APPOINTMENT_STATUSES.REQUESTED || appointment.status === APPOINTMENT_STATUSES.CONFIRMED;

  const handleRescheduleClick = (): void => {
    onReschedule(appointment);
  };

  const handleCancelClick = (): void => {
    onCancel(appointment);
  };

  return (
    <TableRow>
      <TableCell>
        <span className="min-w-0">
          <span className="block font-medium">{appointment.patientName}</span>
          <span className="text-muted-foreground block font-mono text-xs">{appointment.medicalRecordNo}</span>
        </span>
      </TableCell>

      <TableCell>{appointment.doctorName}</TableCell>

      <TableCell className="whitespace-nowrap">{formatShortDate(appointment.date)}</TableCell>

      <TableCell className="text-muted-foreground whitespace-nowrap">
        {appointment.startTime}–{appointment.endTime}
      </TableCell>

      <TableCell>
        <AppointmentStatusBadge status={appointment.status} />
      </TableCell>

      <TableCell>
        {appointment.tokenNo ? (
          <Badge variant="neutral" className="font-mono">
            {appointment.tokenNo}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {!readOnly && (
        <TableCell className="text-end">
          {canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Actions" />}>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleRescheduleClick}>
                  <CalendarClock />
                  Reschedule
                </DropdownMenuItem>

                <DropdownMenuItem variant="destructive" onClick={handleCancelClick}>
                  <Ban />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
