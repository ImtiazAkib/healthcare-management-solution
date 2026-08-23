import { z } from 'zod';

import { INVOICE_FIELD_LIMITS } from '@/constants/billing.const';
import { CODES } from '@/constants/codes.const';

import { encodeZodMessage } from '@/lib/utils';

import { objectIdField } from './object-id.schema';

const INVOICES = CODES.VALIDATION.INVOICES;

/*
  Voiding an invoice. A void is a deliberate act, never a delete, and it must carry a reason — so the
  history says not only that a bill was cancelled but why.
*/
export const InvoiceVoidSchema = z.object({
  invoiceId: objectIdField,
  reason: z
    .string()
    .trim()
    .min(1, encodeZodMessage(INVOICES.VOID_REASON_REQUIRED.CODE, INVOICES.VOID_REASON_REQUIRED.MESSAGE))
    .max(INVOICE_FIELD_LIMITS.VOID_REASON, 'The reason is too long.'),
});

export type InvoiceVoidInput = z.input<typeof InvoiceVoidSchema>;
export type InvoiceVoidOutput = z.output<typeof InvoiceVoidSchema>;
