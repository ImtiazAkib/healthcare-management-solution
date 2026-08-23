import Link from 'next/link';

import { Printer } from 'lucide-react';

import { APP_DATA, INVOICE_STATUSES, SERVICE_CATEGORY_LABELS } from '@/constants';
import { InvoiceDto, PaymentDto } from '@/types';

import { formatMoney, formatShortDateTime } from '@/lib/utils';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import { InvoiceStatusBadge } from './invoice-status.badge';
import { InvoiceVoidDialog } from './invoice-void.dialog';
import { PaymentHistory } from './payment-history';
import { PaymentRecordDialog } from './payment-record.dialog';

type InvoiceDetailProps = {
  invoice: InvoiceDto;
  payments: PaymentDto[];
};

/** The currency symbol prefixes every amount; formatting is the same helper everywhere. */
function money(minorUnits: number): string {
  return `${APP_DATA.CURRENCY.SYMBOL}${formatMoney(minorUnits)}`;
}

/*
  A single invoice in full — its lines, its totals, how much is paid and what is left, and the record
  of payments taken against it. A server component: the totals are the service's own figures, read and
  formatted here, never re-derived. The two mutating controls — record a payment, void the bill — are
  client children, and they are shown only while the bill is still open: a paid or voided invoice
  offers neither, matching the transitions the service allows.
*/
export function InvoiceDetail({ invoice, payments }: InvoiceDetailProps) {
  // Both a settled bill and a voided one are closed to further action; only the reason differs.
  const canTransact = invoice.status !== INVOICE_STATUSES.PAID && invoice.status !== INVOICE_STATUSES.VOID;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1>{invoice.patientName ?? 'Unknown patient'}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          {invoice.medicalRecordNo && <p className="text-muted-foreground text-sm">MRN: {invoice.medicalRecordNo}</p>}
          <p className="text-muted-foreground text-sm">Issued {formatShortDateTime(invoice.issuedAt)}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canTransact && <PaymentRecordDialog invoice={invoice} />}
          {canTransact && <InvoiceVoidDialog invoice={invoice} />}
          <Button variant="outline" nativeButton={false} render={<Link href={`/admin/invoices/${invoice.invoiceId}/print`} />}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      {invoice.status === INVOICE_STATUSES.VOID && invoice.voidReason && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Voided:</span> {invoice.voidReason}
        </div>
      )}

      <div className="border-border w-full overflow-x-auto rounded-lg border">
        <Table aria-label="Invoice lines" className="min-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-end">Unit price</TableHead>
              <TableHead className="text-end">Qty</TableHead>
              <TableHead className="text-end">Line total</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {invoice.lines.map((line, index) => (
              <TableRow key={`${index}-${line.serviceCode}`}>
                <TableCell>
                  <span className="block font-medium">{line.description}</span>
                  <span className="text-muted-foreground block text-xs">{line.serviceCode}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{SERVICE_CATEGORY_LABELS[line.category]}</TableCell>
                <TableCell className="text-end whitespace-nowrap tabular-nums">{money(line.unitPriceMinorUnits)}</TableCell>
                <TableCell className="text-end tabular-nums">{line.quantity}</TableCell>
                <TableCell className="text-end whitespace-nowrap tabular-nums">{money(line.lineTotalMinorUnits)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-1.5 sm:ml-auto sm:w-72">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{money(invoice.subtotalMinorUnits)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <span className="tabular-nums">− {money(invoice.discountMinorUnits)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums">+ {money(invoice.taxMinorUnits)}</span>
        </div>
        <div className="border-border flex items-center justify-between border-t pt-1.5 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{money(invoice.totalMinorUnits)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Paid</span>
          <span className="tabular-nums">{money(invoice.paidMinorUnits)}</span>
        </div>
        <div className="flex items-center justify-between font-medium">
          <span>Balance</span>
          <span className="tabular-nums">{money(invoice.balanceMinorUnits)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Payments</h2>
        <PaymentHistory payments={payments} />
      </div>
    </div>
  );
}
