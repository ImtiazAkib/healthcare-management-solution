'use server';

import { InvoiceDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { InvoiceCreateSchema, InvoiceVoidSchema, PaymentRecordSchema } from '@/lib/schemas';
import { InvoiceService, PaymentService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const invoiceService = new InvoiceService();
const paymentService = new PaymentService();

/*
  Billing is an administration act — raising a bill, taking a payment, voiding a bill — so every
  action gates through `gateAdminArea` and passes the gate's requester as the actor. Nothing here
  trusts an id or a total from the caller: the schemas carry neither a subtotal nor a total, and the
  services price and total everything server-side.
*/

/**
 * Raise an invoice from priced catalogue lines.
 *
 * @param values - Raw form values (patient, optional encounter, lines, discount, tax).
 *
 * @returns The raised invoice, or a failure.
 */
export async function raiseInvoiceAction(values: unknown): Promise<SingleResult<InvoiceDto>> {
  const gate = await gateAdminArea<InvoiceDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = InvoiceCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return invoiceService.create(validation.data, gate.requester);
}

/**
 * Record a payment against an invoice.
 *
 * @param values - Raw form values (invoice, amount, method, reference).
 *
 * @returns The updated invoice, or a failure.
 */
export async function recordPaymentAction(values: unknown): Promise<SingleResult<InvoiceDto>> {
  const gate = await gateAdminArea<InvoiceDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = PaymentRecordSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return paymentService.record(validation.data, gate.requester);
}

/**
 * Void an invoice, with a reason. Never a delete.
 *
 * @param values - Raw form values (invoice, reason).
 *
 * @returns The voided invoice, or a failure.
 */
export async function voidInvoiceAction(values: unknown): Promise<SingleResult<InvoiceDto>> {
  const gate = await gateAdminArea<InvoiceDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = InvoiceVoidSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return invoiceService.void(validation.data, gate.requester);
}
