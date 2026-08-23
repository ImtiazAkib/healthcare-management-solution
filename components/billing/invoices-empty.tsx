import { ReceiptText } from 'lucide-react';

import { EmptyState } from '@/components/ui';

type InvoicesEmptyProps = {
  /** True when filters are applied, so the message changes from "none yet" to "none match". */
  filtered: boolean;
};

/**
 * Shown when the invoices list is empty. An empty result is a normal answer — either no bill has
 * been raised yet, or the current filters match none — not an error.
 */
export function InvoicesEmpty({ filtered }: InvoicesEmptyProps) {
  return (
    <EmptyState
      icon={ReceiptText}
      title={filtered ? 'No invoices match these filters' : 'No invoices yet'}
      description={
        filtered ? 'Try another status, or clear the search.' : 'Raise an invoice from a patient and the catalogue of services to start billing.'
      }
    />
  );
}
