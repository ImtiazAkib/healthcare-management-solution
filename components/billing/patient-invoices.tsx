import { ReceiptText } from 'lucide-react';

import { APP_DATA } from '@/constants';
import { InvoiceDto } from '@/types';

import { isOnlinePaymentEnabled } from '@/lib/billing';
import { formatMoney, formatShortDate } from '@/lib/utils';

import { EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import { InvoiceStatusBadge } from './invoice-status.badge';

type PatientInvoicesProps = {
  invoices: InvoiceDto[];
};

/** The currency symbol prefixes every amount; formatting is the same helper everywhere. */
function money(minorUnits: number): string {
  return `${APP_DATA.CURRENCY.SYMBOL}${formatMoney(minorUnits)}`;
}

/*
  A patient's own bills, read-only. There is nothing to act on here: payments are taken at the counter
  in this build, so the screen says so plainly rather than offering a "Pay now" button that would do
  nothing. `isOnlinePaymentEnabled` is the one switch that decides which note shows — the day a gateway
  is wired in, this is where a pay control would appear, and the counter note would step aside.
*/
export function PatientInvoices({ invoices }: PatientInvoicesProps) {
  if (invoices.length === 0) {
    return <EmptyState icon={ReceiptText} title="No invoices yet" description="Any bill raised for your care will appear here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {!isOnlinePaymentEnabled && (
        <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          Payments are taken at the reception counter. Bring your record number when you settle a balance.
        </p>
      )}

      <div className="border-border w-full overflow-x-auto rounded-lg border">
        <Table aria-label="My invoices" className="min-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead>Issued</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead className="text-end">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {invoices.map(invoice => (
              <TableRow key={invoice.invoiceId}>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatShortDate(invoice.issuedAt)}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {invoice.lines.length} {invoice.lines.length === 1 ? 'item' : 'items'}
                </TableCell>
                <TableCell className="text-end whitespace-nowrap tabular-nums">{money(invoice.totalMinorUnits)}</TableCell>
                <TableCell className="text-end whitespace-nowrap tabular-nums">{money(invoice.balanceMinorUnits)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
