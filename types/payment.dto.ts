import { toId } from '@/lib/utils';

import { PaymentMethod } from './payment-method';

import type { PaymentEntity } from '@/models/payment.model';

/**
 * A payment as a screen sees one — the amount in integer minor units, how it was taken, and its
 * reference, for the payment history under an invoice.
 */
export type PaymentDto = {
  paymentId: string;
  invoiceId: string;
  amountMinorUnits: number;
  method: PaymentMethod;
  reference: string | null;
  receivedById: string;
  receivedAt: string;
  createdAt: string;
};

/**
 * Map a stored payment to its DTO.
 *
 * @param entity - Stored payment.
 *
 * @returns Instance of PaymentDto.
 */
export function paymentFromEntity(entity: PaymentEntity): PaymentDto {
  return {
    paymentId: toId(entity._id),
    invoiceId: toId(entity.invoice),
    amountMinorUnits: entity.amountMinorUnits,
    method: entity.method,
    reference: entity.reference ?? null,
    receivedById: toId(entity.receivedBy),
    receivedAt: entity.receivedAt.toISOString(),
    createdAt: entity.createdAt.toISOString(),
  };
}
