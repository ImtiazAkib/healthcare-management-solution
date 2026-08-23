import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { LabOrdersTableRow } from './lab-orders-table-row';

import type { LabOrderRow } from './lab.types';

type LabOrdersTableProps = {
  rows: LabOrderRow[];
};

/*
  The doctor's lab orders — every order they have raised, across their patients, so the patient is a
  column of its own. Read-only: the doctor orders the work and reads the report, but does not work
  the order, so there are no controls here.
*/
export function LabOrdersTable({ rows }: LabOrdersTableProps) {
  return (
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Lab orders" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Report</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map(row => (
            <LabOrdersTableRow key={row.labOrderId} order={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
