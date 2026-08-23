import { createLoader, parseAsString } from 'nuqs/server';

import { INVOICE_STATUS_FILTERS } from '@/constants';

/*
  One definition of the invoices list's URL state, read from both sides: `InvoicesFilters` writes it
  with the client hooks, the page reads it on the server. Declaring it twice is how the two quietly
  drift apart.

  The values are parsed as plain strings here and validated by `InvoiceFiltersSchema`, which is where a
  nonsense `?status=wizard` falls back to "all".
*/
export const invoicesSearchParams = {
  status: parseAsString.withDefault(INVOICE_STATUS_FILTERS.ALL),
  query: parseAsString.withDefault(''),
};

export const loadInvoicesSearchParams = createLoader(invoicesSearchParams);
