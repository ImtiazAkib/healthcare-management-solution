import mongoose, { Model, Schema, Types } from 'mongoose';

import { EncounterStatus } from '@/types';

import { ENCOUNTER_FIELD_LIMITS, ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { CALENDAR_DATE_PATTERN } from '@/constants/schedule.const';

/**
 * The consultation itself: what the patient came in with, what was found, what was decided.
 *
 * **Append-mostly.** A doctor edits their notes while the encounter is open; once it is
 * completed a correction is an `addendum` with its own author and timestamp, never an
 * overwrite. A medical record that can be silently rewritten is not a medical record, and
 * the model is where that rule is cheapest to keep.
 */
export type EncounterAttributes = {
  /** One encounter per appointment — enforced by a unique index. */
  appointment: Types.ObjectId;
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  chiefComplaint?: string;
  examination?: string;
  /**
   * Free text with an optional code beside it. No coded vocabulary ships — see the note on
   * `DIAGNOSIS_CODE`.
   */
  diagnoses: {
    description: string;
    code?: string;
  }[];
  treatmentNotes?: string;
  /** `YYYY-MM-DD`. What step 18 turns into a reminder. */
  followUpDate?: string;
  status: EncounterStatus;
  completedAt?: Date;
  addenda: {
    note: string;
    addedBy: Types.ObjectId;
    addedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

export type EncounterEntity = EncounterAttributes & { _id: Types.ObjectId };

type EncounterModel = Model<EncounterAttributes>;

const diagnosisSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: ENCOUNTER_FIELD_LIMITS.DIAGNOSIS_DESCRIPTION },
    code: { type: String, trim: true, maxlength: ENCOUNTER_FIELD_LIMITS.DIAGNOSIS_CODE },
  },
  { _id: false }
);

const addendumSchema = new Schema(
  {
    note: { type: String, required: true, trim: true, maxlength: ENCOUNTER_FIELD_LIMITS.ADDENDUM },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const encounterSchema = new Schema<EncounterAttributes, EncounterModel>(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    chiefComplaint: { type: String, trim: true, maxlength: ENCOUNTER_FIELD_LIMITS.CHIEF_COMPLAINT },
    examination: { type: String, trim: true, maxlength: ENCOUNTER_FIELD_LIMITS.EXAMINATION },
    diagnoses: {
      type: [diagnosisSchema],
      default: [],
      validate: [(value: unknown[]) => value.length <= ENCOUNTER_FIELD_LIMITS.DIAGNOSES, 'Too many diagnoses recorded.'],
    },
    treatmentNotes: { type: String, trim: true, maxlength: ENCOUNTER_FIELD_LIMITS.TREATMENT_NOTES },
    followUpDate: { type: String, match: CALENDAR_DATE_PATTERN },
    status: { type: String, required: true, enum: Object.values(ENCOUNTER_STATUSES), default: ENCOUNTER_STATUSES.OPEN },
    completedAt: { type: Date },
    addenda: { type: [addendumSchema], default: [] },
  },
  { timestamps: true }
);

/*
  The patient timeline: every encounter for one patient, newest first. It is the query step
  10 is built around and the one a doctor runs before every consultation.
*/
encounterSchema.index({ patient: 1, createdAt: -1 });
// The doctor's own history, for the relationship check that decides who may open a record.
encounterSchema.index({ doctor: 1, patient: 1 });

export const Encounter =
  (mongoose.models.Encounter as EncounterModel) ?? mongoose.model<EncounterAttributes, EncounterModel>('Encounter', encounterSchema);
