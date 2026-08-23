import mongoose, { Model, Schema, Types } from 'mongoose';

import { PaymentMethod } from '@/types';

import { INVOICE_FIELD_LIMITS, PAYMENT_METHODS } from '@/constants/billing.const';
import { SERVICE_PRICE_MAX_MINOR_UNITS } from '@/constants/service.const';

/**
 * One payment recorded against an invoice.
 *
 * A payment is a fact — how much was taken, how, and who took it — and it is never edited or deleted
 * once written. The invoice's `paidMinorUnits` is kept in step with the sum of these, and its status
 * follows from that. A refund is deliberately not modelled as a negative payment: it is a decision
 * with a policy behind it, left to the backlog.
 */
export type PaymentAttributes = {
  invoice: Types.ObjectId;
  amountMinorUnits: number;
  method: PaymentMethod;
  /** A receipt or transaction number, when the method carries one. */
  reference?: string;
  receivedBy: Types.ObjectId;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentEntity = PaymentAttributes & { _id: Types.ObjectId };

type PaymentModel = Model<PaymentAttributes>;

const paymentSchema = new Schema<PaymentAttributes, PaymentModel>(
  {
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    amountMinorUnits: { type: Number, required: true, min: 1, max: SERVICE_PRICE_MAX_MINOR_UNITS },
    method: { type: String, required: true, enum: Object.values(PAYMENT_METHODS) },
    reference: { type: String, trim: true, maxlength: INVOICE_FIELD_LIMITS.PAYMENT_REFERENCE },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// One invoice's payment history, in the order they were taken.
paymentSchema.index({ invoice: 1, receivedAt: 1 });

export const Payment = (mongoose.models.Payment as PaymentModel) ?? mongoose.model<PaymentAttributes, PaymentModel>('Payment', paymentSchema);
