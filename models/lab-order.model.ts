import mongoose, { Model, Schema, Types } from 'mongoose';

import { LabPriority, LabStatus } from '@/types';

import { LAB_FIELD_LIMITS, LAB_PRIORITIES, LAB_STATUSES } from '@/constants/lab.const';

/**
 * A request for diagnostic work, raised by a doctor during a consultation.
 *
 * The tests are recorded by name here rather than referencing the priced service catalogue.
 * The catalogue lands in step 6b, and an order raised today should not break if a service is
 * renamed tomorrow — so the name is captured at the moment of ordering, and the link to a
 * priced item is the billing step's job.
 */
export type LabOrderAttributes = {
  encounter: Types.ObjectId;
  patient: Types.ObjectId;
  /** The doctor who ordered it. Their name prints on the request. */
  orderedBy: Types.ObjectId;
  tests: {
    name: string;
    code?: string;
  }[];
  priority: LabPriority;
  status: LabStatus;
  notes?: string;
  cancelledAt?: Date;
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LabOrderEntity = LabOrderAttributes & { _id: Types.ObjectId };

type LabOrderModel = Model<LabOrderAttributes>;

const labTestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: LAB_FIELD_LIMITS.TEST_NAME },
    code: { type: String, trim: true, uppercase: true, maxlength: LAB_FIELD_LIMITS.TEST_CODE },
  },
  { _id: false }
);

const labOrderSchema = new Schema<LabOrderAttributes, LabOrderModel>(
  {
    encounter: { type: Schema.Types.ObjectId, ref: 'Encounter', required: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    orderedBy: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    tests: {
      type: [labTestSchema],
      required: true,
      validate: [
        (value: unknown[]) => value.length > 0 && value.length <= LAB_FIELD_LIMITS.TESTS,
        'An order needs at least one test, and no more than thirty.',
      ],
    },
    priority: { type: String, required: true, enum: Object.values(LAB_PRIORITIES), default: LAB_PRIORITIES.ROUTINE },
    status: { type: String, required: true, enum: Object.values(LAB_STATUSES), default: LAB_STATUSES.ORDERED },
    notes: { type: String, trim: true, maxlength: LAB_FIELD_LIMITS.SUMMARY },
    cancelledAt: { type: Date },
    cancelledReason: { type: String, trim: true, maxlength: LAB_FIELD_LIMITS.SUMMARY },
  },
  { timestamps: true }
);

// The lab's work list: what is outstanding, most urgent first.
labOrderSchema.index({ status: 1, priority: 1, createdAt: 1 });
labOrderSchema.index({ patient: 1, createdAt: -1 });
labOrderSchema.index({ encounter: 1 });

export const LabOrder = (mongoose.models.LabOrder as LabOrderModel) ?? mongoose.model<LabOrderAttributes, LabOrderModel>('LabOrder', labOrderSchema);
