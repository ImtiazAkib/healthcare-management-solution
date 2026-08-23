import { APP_DATA, PAYMENT_METHOD_LABELS } from '@/constants';
import { PaymentDto } from '@/types';

import { formatMoney, formatShortDateTime } from '@/lib/utils';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

type PaymentHistoryProps = {
  payments: PaymentDto[];
};

/*
  The payments taken against an invoice, newest the service returns them. A bill can be settled in
  parts, so this is the audit of how the balance was cleared — each amount, how it was taken, and the
  receipt or transaction reference where there is one. No payment is ever edited or removed, so this
  is read-only by design.
*/
export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">No payments recorded yet.</p>;
  }

  return (
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Payments" className="min-w-xl">
        <TableHeader>
          <TableRow>
            <TableHead>Received</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-end">Amount</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {payments.map(payment => (
            <TableRow key={payment.paymentId}>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatShortDateTime(payment.receivedAt)}</TableCell>
              <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
              <TableCell className="text-muted-foreground">{payment.reference ?? '—'}</TableCell>
              <TableCell className="text-end whitespace-nowrap tabular-nums">
                {APP_DATA.CURRENCY.SYMBOL}
                {formatMoney(payment.amountMinorUnits)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
