import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { AppointmentsTableRow } from './appointments-table-row';

import type { AppointmentRow } from './appointments.types';

type AppointmentsTableProps = {
  rows: AppointmentRow[];
  /** True on the doctor's own list, which drops the actions column. Defaults to the managed list. */
  readOnly?: boolean;
  onReschedule?: (appointment: AppointmentRow) => void;
  onCancel?: (appointment: AppointmentRow) => void;
};

const noop = (): void => {};

export function AppointmentsTable({ rows, readOnly = false, onReschedule = noop, onCancel = noop }: AppointmentsTableProps) {
  return (
    /*
      The wrapper scrolls and the table refuses to go below its natural width — without that floor
      the browser honours the 100% width and crushes every column, which is what would stack the
      time range and the action control on top of each other on a phone.
    */
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Appointments" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Token</TableHead>
            {!readOnly && <TableHead className="text-end">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map(x => (
            <AppointmentsTableRow key={x.appointmentId} appointment={x} readOnly={readOnly} onReschedule={onReschedule} onCancel={onCancel} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
