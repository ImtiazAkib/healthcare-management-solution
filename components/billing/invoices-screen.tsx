import Link from 'next/link';

import { Plus } from 'lucide-react';

import { ROUTES } from '@/constants';
import { InvoiceDto } from '@/types';

import { Button, PageHeader } from '@/components/ui';

import { InvoicesEmpty } from './invoices-empty';
import { InvoicesFilters } from './invoices-filters';
import { InvoicesTable } from './invoices-table';

type InvoicesScreenProps = {
  invoices: InvoiceDto[];
  /** True when any filter is applied, so the empty state can tell "none yet" from "none match". */
  filtered: boolean;
};

/*
  The invoices list, composed. Unlike the users screen this stays a server component: the rows carry
  no in-place dialogs — every action is a link to the detail — so nothing here needs client state.
  The one interactive piece, the filter row, is a client child that writes the URL on its own.
*/
export function InvoicesScreen({ invoices, filtered }: InvoicesScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Every bill raised at the counter, newest first. Open one to record a payment, void it, or print it."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_INVOICES_NEW.HREF} />}>
            <Plus className="size-4" />
            Raise invoice
          </Button>
        }
      />

      <InvoicesFilters />

      {invoices.length === 0 ? <InvoicesEmpty filtered={filtered} /> : <InvoicesTable invoices={invoices} />}
    </div>
  );
}
