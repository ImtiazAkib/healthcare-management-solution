import { z } from 'zod';

import { INVOICE_FIELD_LIMITS, PAYMENT_METHODS } from '@/constants/billing.const';
import { CODES } from '@/constants/codes.const';

import { encodeZodMessage, toMinorUnits } from '@/lib/utils';

import { objectIdField } from './object-id.schema';

const PAYMENTS = CODES.VALIDATION.PAYMENTS;

/*
  Recording a payment taken at the counter. The amount arrives as a major-unit amount as typed and is
  converted to integer minor units here; a zero or invalid amount is refused. The service is what
  checks the amount against the outstanding balance — this only checks it is a real, positive figure.
*/
export const PaymentRecordSchema = z.object({
  invoiceId: objectIdField,
  amountMinorUnits: z
    .string()
    .trim()
    .transform(value => toMinorUnits(value))
    .refine(value => Number.isInteger(value) && value >= 1, encodeZodMessage(PAYMENTS.INVALID_AMOUNT.CODE, PAYMENTS.INVALID_AMOUNT.MESSAGE)),
  method: z.enum(Object.values(PAYMENT_METHODS), 'Choose how the payment was taken.'),
  reference: z.string().trim().max(INVOICE_FIELD_LIMITS.PAYMENT_REFERENCE, 'The reference is too long.').optional().or(z.literal('')),
});

export type PaymentRecordInput = z.input<typeof PaymentRecordSchema>;
export type PaymentRecordOutput = z.output<typeof PaymentRecordSchema>;
