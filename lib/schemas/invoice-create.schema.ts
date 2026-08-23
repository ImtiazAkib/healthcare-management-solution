import { z } from 'zod';

import { INVOICE_FIELD_LIMITS } from '@/constants/billing.const';
import { CODES } from '@/constants/codes.const';
import { SERVICE_PRICE_MAX_MINOR_UNITS } from '@/constants/service.const';

import { encodeZodMessage, toMinorUnits } from '@/lib/utils';

import { objectIdField } from './object-id.schema';

const INVOICES = CODES.VALIDATION.INVOICES;

/*
  Raising an invoice. What this schema leaves out is the security: there is **no subtotal, no line
  total and no invoice total** — the server prices every line from the catalogue and adds them up
  itself, so a client that sends a total finds it simply gone. Each line names a catalogue service by
  id and a quantity; the price is looked up and snapshotted server-side, never taken from here.

  The discount and tax are the two figures a person genuinely sets. They arrive as major-unit amounts
  as typed ("50" / "50.00") and are converted to integer minor units at this edge, the one place a
  price crosses between the two — a blank one is zero, not an error.
*/
const moneyField = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform(value => (value && value !== '' ? toMinorUnits(value) : 0))
    // Bounded above as well as below: a discount is further capped at the subtotal in the service, but
    // a tax has no other ceiling, so the same sanity bound the catalogue price carries applies here.
    .refine(value => Number.isInteger(value) && value >= 0 && value <= SERVICE_PRICE_MAX_MINOR_UNITS, label);

export const InvoiceCreateSchema = z.object({
  patientId: objectIdField,
  encounterId: objectIdField
    .optional()
    .or(z.literal(''))
    .transform(value => (value ? value : undefined)),
  lines: z
    .array(
      z.object({
        serviceItemId: objectIdField,
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(INVOICE_FIELD_LIMITS.MAX_QUANTITY, 'Quantity is too large.'),
      })
    )
    .min(1, encodeZodMessage(INVOICES.NO_LINES.CODE, INVOICES.NO_LINES.MESSAGE))
    .max(INVOICE_FIELD_LIMITS.LINES, 'An invoice cannot carry that many lines.'),
  discountMinorUnits: moneyField('Enter a valid discount.'),
  taxMinorUnits: moneyField('Enter a valid tax amount.'),
});

export type InvoiceCreateInput = z.input<typeof InvoiceCreateSchema>;
export type InvoiceCreateOutput = z.output<typeof InvoiceCreateSchema>;
