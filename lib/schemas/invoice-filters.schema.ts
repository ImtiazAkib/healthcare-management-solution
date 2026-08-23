import { z } from 'zod';

import { INVOICE_STATUS_FILTERS } from '@/constants/billing.const';

/*
  The invoices list's URL state. A nonsense `?status=wizard` falls back to "all" rather than throwing,
  the same way the users and patients filters degrade — a hand-edited URL should narrow to nothing
  useful, not error. The query searches the patient's name and medical record number.
*/
export const InvoiceFiltersSchema = z.object({
  status: z.enum(Object.values(INVOICE_STATUS_FILTERS)).catch(INVOICE_STATUS_FILTERS.ALL).default(INVOICE_STATUS_FILTERS.ALL),
  query: z.string().trim().max(120).catch('').default(''),
});

export type InvoiceFiltersInput = z.input<typeof InvoiceFiltersSchema>;
export type InvoiceFiltersOutput = z.output<typeof InvoiceFiltersSchema>;
