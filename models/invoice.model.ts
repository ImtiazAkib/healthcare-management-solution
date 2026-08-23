import mongoose, { Model, Schema, Types } from 'mongoose';

import { InvoiceStatus, ServiceCategory } from '@/types';

import { INVOICE_FIELD_LIMITS, INVOICE_STATUSES } from '@/constants/billing.const';
import { SERVICE_CATEGORIES, SERVICE_FIELD_LIMITS, SERVICE_PRICE_MAX_MINOR_UNITS } from '@/constants/service.const';

/**
 * One priced line on an invoice, **snapshotted at issue time**.
 *
 * The catalogue may change — a price rises, a service is retired — but a bill already handed to
 * someone may not. So the code, name, category and unit price are copied onto the line rather than
 * referenced, and the line total is the unit price times the quantity, computed by the service and
 * stored so a re-priced catalogue can never silently restate an old bill.
 */
type InvoiceLine = {
  serviceCode: string;
  description: string;
  category: ServiceCategory;
  unitPriceMinorUnits: number;
  quantity: number;
  lineTotalMinorUnits: number;
};

/**
 * What a visit cost, what was paid, and what is still owed.
 *
 * **Money is an integer count of minor units throughout** — see `money.utils.ts` for why a float
 * never touches a total. Every figure here is computed by the service from the snapshotted lines,
 * never accepted from the client. The status is derived from `paidMinorUnits` against
 * `totalMinorUnits`, except `void`, which is a deliberate act with a reason and never a delete.
 */
export type InvoiceAttributes = {
  patient: Types.ObjectId;
  /** The visit this bills, when it was raised from one. Optional — a standalone charge has none. */
  encounter?: Types.ObjectId;
  lines: InvoiceLine[];
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  /** Kept in step with the payments by the service, so status and balance need no recount to read. */
  paidMinorUnits: number;
  status: InvoiceStatus;
  issuedBy: Types.ObjectId;
  issuedAt: Date;
  voidReason?: string;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceEntity = InvoiceAttributes & { _id: Types.ObjectId };

type InvoiceModel = Model<InvoiceAttributes>;

const invoiceLineSchema = new Schema<InvoiceLine>(
  {
    serviceCode: { type: String, required: true, trim: true, maxlength: SERVICE_FIELD_LIMITS.CODE },
    description: { type: String, required: true, trim: true, maxlength: SERVICE_FIELD_LIMITS.NAME },
    category: { type: String, required: true, enum: Object.values(SERVICE_CATEGORIES) },
    unitPriceMinorUnits: { type: Number, required: true, min: 0, max: SERVICE_PRICE_MAX_MINOR_UNITS },
    quantity: { type: Number, required: true, min: 1, max: INVOICE_FIELD_LIMITS.MAX_QUANTITY },
    lineTotalMinorUnits: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<InvoiceAttributes, InvoiceModel>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    encounter: { type: Schema.Types.ObjectId, ref: 'Encounter' },
    lines: {
      type: [invoiceLineSchema],
      required: true,
      validate: [
        (value: unknown[]) => value.length >= 1 && value.length <= INVOICE_FIELD_LIMITS.LINES,
        'An invoice needs between one and forty lines.',
      ],
    },
    subtotalMinorUnits: { type: Number, required: true, min: 0 },
    discountMinorUnits: { type: Number, required: true, min: 0, default: 0 },
    taxMinorUnits: { type: Number, required: true, min: 0, default: 0 },
    totalMinorUnits: { type: Number, required: true, min: 0 },
    paidMinorUnits: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, required: true, enum: Object.values(INVOICE_STATUSES), default: INVOICE_STATUSES.UNPAID },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    voidReason: { type: String, trim: true, maxlength: INVOICE_FIELD_LIMITS.VOID_REASON },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// A patient's own invoices, newest first — what the patient's billing page and the counter both read.
invoiceSchema.index({ patient: 1, createdAt: -1 });
// The admin list's filter: by status, newest first.
invoiceSchema.index({ status: 1, createdAt: -1 });

export const Invoice = (mongoose.models.Invoice as InvoiceModel) ?? mongoose.model<InvoiceAttributes, InvoiceModel>('Invoice', invoiceSchema);
