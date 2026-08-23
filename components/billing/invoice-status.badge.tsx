import { INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANTS } from '@/constants';

import { Badge } from '@/components/ui';

import type { InvoiceStatus } from '@/types';

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
};

/*
  One chip for an invoice's status, so a paid bill, a part-paid one and a void read apart at a
  glance and identically everywhere — the list, the detail and the print sheet. The color and the
  word both come from the shared status maps, never hand-picked at the call site.
*/
export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return <Badge variant={INVOICE_STATUS_VARIANTS[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}
