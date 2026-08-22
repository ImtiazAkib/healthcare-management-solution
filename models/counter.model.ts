import mongoose, { Model, Schema } from 'mongoose';

/**
 * A named, monotonically increasing sequence.
 *
 * One document per sequence — `patient-mrn-2026` holds this year's patient count — advanced
 * with a single atomic `$inc`. That atomicity is the whole point: a medical record number is
 * allocated from `findByIdAndUpdate(..., { $inc: { seq: 1 } })`, which the database serializes,
 * so two registrations in the same instant get two different numbers rather than reading the
 * same count and both writing it. A `countDocuments()` plus an insert could not promise that.
 */
export type CounterAttributes = {
  /** The sequence's name, e.g. `patient-mrn-2026`. */
  _id: string;
  seq: number;
};

type CounterModel = Model<CounterAttributes>;

const counterSchema = new Schema<CounterAttributes, CounterModel>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

export const Counter = (mongoose.models.Counter as CounterModel) ?? mongoose.model<CounterAttributes, CounterModel>('Counter', counterSchema);
