import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { APP_DATA } from '@/constants';
import { InvoiceDto } from '@/types';

import { formatMoney, formatShortDate } from '@/lib/utils';

import { Button, TableCell, TableRow } from '@/components/ui';

import { InvoiceStatusBadge } from './invoice-status.badge';

type InvoicesTableRowProps = {
  invoice: InvoiceDto;
};

/** The currency symbol prefixes every amount; formatting is the same helper everywhere. */
function money(minorUnits: number): string {
  return `${APP_DATA.CURRENCY.SYMBOL}${formatMoney(minorUnits)}`;
}

export function InvoicesTableRow({ invoice }: InvoicesTableRowProps) {
  const lineCount = invoice.lines.length;

  return (
    <TableRow>
      <TableCell>
        <span className="block font-medium">{invoice.patientName ?? 'Unknown patient'}</span>
        {invoice.medicalRecordNo && <span className="text-muted-foreground block text-xs">MRN: {invoice.medicalRecordNo}</span>}
      </TableCell>

      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatShortDate(invoice.issuedAt)}</TableCell>

      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {lineCount} {lineCount === 1 ? 'item' : 'items'}
      </TableCell>

      <TableCell className="text-end whitespace-nowrap tabular-nums">{money(invoice.totalMinorUnits)}</TableCell>

      <TableCell className="text-end whitespace-nowrap tabular-nums">{money(invoice.balanceMinorUnits)}</TableCell>

      <TableCell>
        <InvoiceStatusBadge status={invoice.status} />
      </TableCell>

      <TableCell className="text-end">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/admin/invoices/${invoice.invoiceId}`} />}>
          View
          <ArrowRight className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
