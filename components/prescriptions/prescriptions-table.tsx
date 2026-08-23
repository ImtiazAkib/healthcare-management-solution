import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { PrescriptionsTableRow } from './prescriptions-table-row';

import type { PrescriptionRow } from './prescriptions.types';

type PrescriptionsTableProps = {
  rows: PrescriptionRow[];
};

export function PrescriptionsTable({ rows }: PrescriptionsTableProps) {
  return (
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Prescriptions" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Record no.</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Drugs</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map(row => (
            <PrescriptionsTableRow key={row.prescriptionId} prescription={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
