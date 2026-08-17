import mongoose, { Model, Schema, Types } from 'mongoose';

import { SERVICE_CATEGORIES, SERVICE_FIELD_LIMITS, SERVICE_PRICE_MAX_MINOR_UNITS } from '@/constants/service.const';

import type { ServiceCategory } from '@/types';

export type ServiceItemAttributes = {
  /** Short, typeable, upper-cased — `CBC`, `XRAY`. A lab order and an invoice line refer to it. */
  code: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  /**
   * The price in the smallest currency unit, as an integer. See `money.utils.ts` for why money
   * is never a float; the ceiling is a sanity bound against a price typed in the wrong unit.
   */
  priceMinorUnits: number;
  /**
   * Deactivate rather than delete. An invoice raised last month still names this service at
   * the price it billed, so a retired service leaves the catalogue but not the record.
   */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceItemEntity = ServiceItemAttributes & { _id: Types.ObjectId };

type ServiceItemModel = Model<ServiceItemAttributes>;

const serviceItemSchema = new Schema<ServiceItemAttributes, ServiceItemModel>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: SERVICE_FIELD_LIMITS.CODE },
    name: { type: String, required: true, unique: true, trim: true, maxlength: SERVICE_FIELD_LIMITS.NAME },
    category: { type: String, required: true, enum: Object.values(SERVICE_CATEGORIES) },
    description: { type: String, trim: true, maxlength: SERVICE_FIELD_LIMITS.DESCRIPTION },
    priceMinorUnits: { type: Number, required: true, min: 0, max: SERVICE_PRICE_MAX_MINOR_UNITS, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

/*
  The catalogue's only real query: the services of one category that are still offered — what a
  picker in billing or diagnostics asks for. Declared now rather than retrofitted then.
*/
serviceItemSchema.index({ category: 1, isActive: 1 });

export const ServiceItem =
  (mongoose.models.ServiceItem as ServiceItemModel) ?? mongoose.model<ServiceItemAttributes, ServiceItemModel>('ServiceItem', serviceItemSchema);
