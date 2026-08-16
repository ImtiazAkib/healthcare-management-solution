import mongoose, { Model, Schema, Types } from 'mongoose';

import { AppointmentStatus, TriagePriority } from '@/types';

import { APPOINTMENT_FIELD_LIMITS, APPOINTMENT_STATUSES, SLOT_HOLDING_STATUSES, TRIAGE_PRIORITIES } from '@/constants/appointment.const';
import { VITALS_RANGES } from '@/constants/encounter.const';
import { CALENDAR_DATE_PATTERN, TIME_PATTERN } from '@/constants/schedule.const';

/**
 * One booked visit.
 *
 * It carries the vitals rather than the encounter does, and that ordering is the reason: a
 * nurse records them at check-in, and the encounter is not opened until the doctor starts
 * the consultation. Hanging them off a document that does not exist yet is not possible, so
 * they live here and the encounter reads them.
 */
export type AppointmentAttributes = {
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  department: Types.ObjectId;
  /** `YYYY-MM-DD` in the facility's timezone. A day, not an instant — see the constant. */
  date: string;
  startTime: string;
  endTime: string;
  /**
   * The queue position, assigned **at check-in** rather than at booking, because a queue is
   * about who is present. Absent until then.
   */
  tokenNo?: number;
  status: AppointmentStatus;
  /** Set by a nurse at triage in step 14. It reorders the queue ahead of token order. */
  triagePriority: TriagePriority;
  reason?: string;
  vitals?: {
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    recordedBy: Types.ObjectId;
    recordedAt: Date;
  };
  /** Who made the booking — reception, the doctor, or the patient themselves. */
  bookedBy: Types.ObjectId;
  checkedInAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentEntity = AppointmentAttributes & { _id: Types.ObjectId };

type AppointmentModel = Model<AppointmentAttributes>;

/*
  Bounded here as well as in the zod schema. A nurse typing a temperature of 986 is the
  mistake this catches, and the model is the last place to catch it before it becomes a
  clinical note that reads as an emergency.
*/
const vitalsSchema = new Schema(
  {
    systolic: { type: Number, min: VITALS_RANGES.SYSTOLIC.MIN, max: VITALS_RANGES.SYSTOLIC.MAX },
    diastolic: { type: Number, min: VITALS_RANGES.DIASTOLIC.MIN, max: VITALS_RANGES.DIASTOLIC.MAX },
    pulse: { type: Number, min: VITALS_RANGES.PULSE.MIN, max: VITALS_RANGES.PULSE.MAX },
    temperature: { type: Number, min: VITALS_RANGES.TEMPERATURE.MIN, max: VITALS_RANGES.TEMPERATURE.MAX },
    respiratoryRate: { type: Number, min: VITALS_RANGES.RESPIRATORY_RATE.MIN, max: VITALS_RANGES.RESPIRATORY_RATE.MAX },
    oxygenSaturation: { type: Number, min: VITALS_RANGES.OXYGEN_SATURATION.MIN, max: VITALS_RANGES.OXYGEN_SATURATION.MAX },
    weight: { type: Number, min: VITALS_RANGES.WEIGHT.MIN, max: VITALS_RANGES.WEIGHT.MAX },
    height: { type: Number, min: VITALS_RANGES.HEIGHT.MIN, max: VITALS_RANGES.HEIGHT.MAX },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new Schema<AppointmentAttributes, AppointmentModel>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    date: { type: String, required: true, match: CALENDAR_DATE_PATTERN },
    startTime: { type: String, required: true, match: TIME_PATTERN },
    endTime: { type: String, required: true, match: TIME_PATTERN },
    tokenNo: { type: Number, min: 1 },
    status: { type: String, required: true, enum: Object.values(APPOINTMENT_STATUSES), default: APPOINTMENT_STATUSES.REQUESTED },
    triagePriority: { type: String, required: true, enum: Object.values(TRIAGE_PRIORITIES), default: TRIAGE_PRIORITIES.ROUTINE },
    reason: { type: String, trim: true, maxlength: APPOINTMENT_FIELD_LIMITS.REASON },
    vitals: { type: vitalsSchema },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkedInAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledReason: { type: String, trim: true, maxlength: APPOINTMENT_FIELD_LIMITS.CANCELLED_REASON },
  },
  { timestamps: true }
);

appointmentSchema.pre('validate', function () {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'The end time must be after the start time.');
  }
});

/*
  **This index is what actually prevents double-booking**, and it has to be an index rather
  than a check in the service. Reading "is this slot free" and then writing the booking are
  two round trips, so two requests arriving together both read free and both write — and the
  patient who loses finds out in the waiting room.

  Partial over the statuses that still hold their slot: a cancelled or no-show appointment
  releases the time, and a plain unique index would keep it reserved forever.
*/
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: [...SLOT_HOLDING_STATUSES] } } }
);

// The doctor's day, and the queue built from it.
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
// A patient's own appointment list, newest first.
appointmentSchema.index({ patient: 1, date: -1 });

export const Appointment =
  (mongoose.models.Appointment as AppointmentModel) ?? mongoose.model<AppointmentAttributes, AppointmentModel>('Appointment', appointmentSchema);
