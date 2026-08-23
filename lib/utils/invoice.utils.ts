import { INVOICE_STATUSES } from '@/constants/billing.const';

import type { InvoiceStatus } from '@/types';

/**
 * The status an invoice's payments imply.
 *
 * Nothing paid is `unpaid`; the full total or more is `paid`; anything between is `partial`. `void`
 * and `draft` are set deliberately and are never returned here — this only ever derives the three
 * payment-driven statuses, so a recorded payment can move a bill along without a person choosing a
 * status by hand.
 *
 * @param totalMinorUnits - The invoice total, in integer minor units.
 * @param paidMinorUnits - What has been paid, in integer minor units.
 *
 * @returns The derived status.
 */
export function derivePaidStatus(totalMinorUnits: number, paidMinorUnits: number): InvoiceStatus {
  if (paidMinorUnits <= 0) {
    return INVOICE_STATUSES.UNPAID;
  }

  if (paidMinorUnits >= totalMinorUnits) {
    return INVOICE_STATUSES.PAID;
  }

  return INVOICE_STATUSES.PARTIAL;
}
