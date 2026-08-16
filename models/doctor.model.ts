import mongoose, { Model, Schema, Types } from 'mongoose';

import { CONSULTATION_FEE_MAX_MINOR_UNITS, DOCTOR_FIELD_LIMITS } from '@/constants/directory.const';

/**
 * A doctor's professional record, hung off the account rather than merged into it.
 *
 * The split is the same one the whole data model is drawn along: `User` answers "who is
 * asking", this answers "what are they here to do". It also means a doctor's registration
 * number and consultation fee are not read into memory on every sign-in.
 */
export type DoctorAttributes = {
  /** One doctor record per account — enforced by a unique index, not by convention. */
  user: Types.ObjectId;
  department: Types.ObjectId;
  specialization: string;
  designation?: string;
  /** The medical council registration. It prints on every prescription this doctor issues. */
  registrationNo: string;
  /** Integer minor units. See the note on the constant — floats and money do not mix. */
  consultationFee: number;
  roomNo?: string;
  biography?: string;
  /**
   * Whether new appointments may be booked. Distinct from the account's `isActive`: a
   * doctor on leave still holds a live account, still owns their past encounters, and
   * simply is not taking bookings this month.
   */
  isAcceptingPatients: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorEntity = DoctorAttributes & { _id: Types.ObjectId };

type DoctorModel = Model<DoctorAttributes>;

const doctorSchema = new Schema<DoctorAttributes, DoctorModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    specialization: { type: String, required: true, trim: true, maxlength: DOCTOR_FIELD_LIMITS.SPECIALIZATION },
    designation: { type: String, trim: true, maxlength: DOCTOR_FIELD_LIMITS.DESIGNATION },
    registrationNo: { type: String, required: true, unique: true, trim: true, maxlength: DOCTOR_FIELD_LIMITS.REGISTRATION_NO },
    consultationFee: { type: Number, required: true, min: 0, max: CONSULTATION_FEE_MAX_MINOR_UNITS, default: 0 },
    roomNo: { type: String, trim: true, maxlength: DOCTOR_FIELD_LIMITS.ROOM_NO },
    biography: { type: String, trim: true, maxlength: DOCTOR_FIELD_LIMITS.BIOGRAPHY },
    isAcceptingPatients: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

/*
  The department directory's only real query: who sits in this department, and which of them
  is taking bookings. Declared now rather than retrofitted when step 8 starts asking it.
*/
doctorSchema.index({ department: 1, isAcceptingPatients: 1 });

export const Doctor = (mongoose.models.Doctor as DoctorModel) ?? mongoose.model<DoctorAttributes, DoctorModel>('Doctor', doctorSchema);
