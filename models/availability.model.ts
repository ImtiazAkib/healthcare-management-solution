import mongoose, { Model, Schema, Types } from 'mongoose';

import { DayOfWeek } from '@/types';

import { DOCTOR_FIELD_LIMITS } from '@/constants/directory.const';
import { CALENDAR_DATE_PATTERN, DAYS_OF_WEEK, SLOT_MINUTES, TIME_PATTERN } from '@/constants/schedule.const';

/**
 * When a doctor sits, and for how long each patient gets.
 *
 * A recurring weekly block, not a list of dates: "Tuesdays, 09:00 to 13:00, twenty-minute
 * slots, room 3". Step 8 expands it into bookable slots and refuses overlaps; this only says
 * what a block is.
 */
export type AvailabilityAttributes = {
  doctor: Types.ObjectId;
  dayOfWeek: DayOfWeek;
  /** Zero-padded `HH:mm`. See the note on `TIME_PATTERN` for why that matters. */
  startTime: string;
  endTime: string;
  slotMinutes: number;
  room?: string;
  /**
   * The window this block applies to, as `YYYY-MM-DD`.
   *
   * A doctor's sitting hours change, and last month's appointments must still render against
   * the hours they were booked under. So a change is a **new block** with a new
   * `effectiveFrom`, and the old one gets an `effectiveTo` — never an edit of history.
   */
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AvailabilityEntity = AvailabilityAttributes & { _id: Types.ObjectId };

type AvailabilityModel = Model<AvailabilityAttributes>;

const availabilitySchema = new Schema<AvailabilityAttributes, AvailabilityModel>(
  {
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    dayOfWeek: { type: String, required: true, enum: DAYS_OF_WEEK },
    startTime: { type: String, required: true, match: TIME_PATTERN },
    endTime: { type: String, required: true, match: TIME_PATTERN },
    slotMinutes: { type: Number, required: true, min: SLOT_MINUTES.MIN, max: SLOT_MINUTES.MAX, default: SLOT_MINUTES.DEFAULT },
    room: { type: String, trim: true, maxlength: DOCTOR_FIELD_LIMITS.ROOM_NO },
    effectiveFrom: { type: String, required: true, match: CALENDAR_DATE_PATTERN },
    effectiveTo: { type: String, match: CALENDAR_DATE_PATTERN },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

/*
  A block that ends before it starts is not a block. Enforced here as well as in the schema
  because scripts write straight to the model — and because a zero-length block would expand
  into zero slots and simply vanish from the week rather than failing loudly.
*/
availabilitySchema.pre('validate', function () {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'The end time must be after the start time.');
  }

  if (this.effectiveTo && this.effectiveFrom && this.effectiveTo < this.effectiveFrom) {
    this.invalidate('effectiveTo', 'The block cannot stop applying before it starts.');
  }
});

// What the week view and the slot picker both ask for.
availabilitySchema.index({ doctor: 1, dayOfWeek: 1, isActive: 1 });
// What the room-clash check in step 8 asks for.
availabilitySchema.index({ room: 1, dayOfWeek: 1, isActive: 1 });

export const Availability =
  (mongoose.models.Availability as AvailabilityModel) ??
  mongoose.model<AvailabilityAttributes, AvailabilityModel>('Availability', availabilitySchema);
