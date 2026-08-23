import { InvoiceDto } from '@/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { InvoicesTableRow } from './invoices-table-row';

type InvoicesTableProps = {
  invoices: InvoiceDto[];
};

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  return (
    /*
      The wrapper scrolls and the table refuses to go below its natural width, so the amount and
      action columns are never crushed together on a phone — the same floor the other list tables set.
    */
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Invoices" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-end">Total</TableHead>
            <TableHead className="text-end">Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {invoices.map(x => (
            <InvoicesTableRow key={x.invoiceId} invoice={x} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
