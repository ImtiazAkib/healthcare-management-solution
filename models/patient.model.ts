import mongoose, { Model, Schema, Types } from 'mongoose';

import { BloodGroup } from '@/types';

import { BLOOD_GROUPS, PATIENT_FIELD_LIMITS } from '@/constants/patient.const';

/**
 * A patient's clinical record, deliberately separate from their account.
 *
 * Allergies, conditions and blood group are health information. Keeping them off `User`
 * means they are not in the document every sign-in reads, not in the document the session
 * token is minted from, and not fetched by any code path that only wanted to know who was
 * asking. The audit trail in step 21a is drawn along this same line: a read of *this*
 * document is a clinical access, a read of the account is not.
 */
export type PatientAttributes = {
  /** One patient record per account — enforced by a unique index, not by convention. */
  user: Types.ObjectId;
  /**
   * Issued once, never changed. It survives a name change, a new phone number and a lost
   * card, which is exactly why every clinical document references this rather than a name.
   */
  medicalRecordNo: string;
  bloodGroup?: BloodGroup;
  allergies: string[];
  chronicConditions: string[];
  /**
   * Who to call, and how they are related. Embedded rather than referenced: it belongs to
   * this patient, is read whenever the record is, and is never queried on its own.
   */
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  address?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientEntity = PatientAttributes & { _id: Types.ObjectId };

type PatientModel = Model<PatientAttributes>;

const emergencyContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: PATIENT_FIELD_LIMITS.CONTACT_NAME },
    relation: { type: String, required: true, trim: true, maxlength: PATIENT_FIELD_LIMITS.CONTACT_RELATION },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { _id: false }
);

const patientSchema = new Schema<PatientAttributes, PatientModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    medicalRecordNo: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 24 },
    bloodGroup: { type: String, enum: BLOOD_GROUPS },
    /*
      Bounded in the model as well as the schema, because the seed and migration scripts
      write straight here. An unbounded array on a document read by every clinical screen is
      a slow page waiting to happen.
    */
    allergies: {
      type: [{ type: String, trim: true, maxlength: PATIENT_FIELD_LIMITS.CLINICAL_ENTRY }],
      default: [],
      validate: [(value: string[]) => value.length <= PATIENT_FIELD_LIMITS.CLINICAL_ENTRIES, 'Too many allergies recorded.'],
    },
    chronicConditions: {
      type: [{ type: String, trim: true, maxlength: PATIENT_FIELD_LIMITS.CLINICAL_ENTRY }],
      default: [],
      validate: [(value: string[]) => value.length <= PATIENT_FIELD_LIMITS.CLINICAL_ENTRIES, 'Too many conditions recorded.'],
    },
    emergencyContact: { type: emergencyContactSchema },
    address: { type: String, trim: true, maxlength: PATIENT_FIELD_LIMITS.ADDRESS },
  },
  { timestamps: true }
);

export const Patient = (mongoose.models.Patient as PatientModel) ?? mongoose.model<PatientAttributes, PatientModel>('Patient', patientSchema);
