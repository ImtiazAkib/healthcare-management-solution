import type { Metadata } from 'next';

import { INVOICE_STATUS_FILTERS } from '@/constants';

import { requireAdminArea } from '@/lib/auth';
import { InvoiceFiltersSchema } from '@/lib/schemas';
import { InvoiceService } from '@/lib/services';

import { InvoicesScreen } from '@/components/billing';

import { loadInvoicesSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const invoiceService = new InvoiceService();

type AdminInvoicesPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Invoices',
  robots: { index: false, follow: false },
};

export default async function AdminInvoicesPage({ searchParams }: AdminInvoicesPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `InvoiceFiltersSchema` catches rather than throws on every
    field, so a hand-edited query string degrades to the unfiltered list instead of an error page.
  */
  const filters = InvoiceFiltersSchema.parse(await loadInvoicesSearchParams(searchParams));

  const result = await invoiceService.list(filters);

  if (!result.success) {
    throw new Error('Could not load invoices. Please try again.');
  }

  const isFiltered = filters.status !== INVOICE_STATUS_FILTERS.ALL || filters.query !== '';

  return <InvoicesScreen invoices={result.result} filtered={isFiltered} />;
}
