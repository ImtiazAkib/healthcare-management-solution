import mongoose, { Model, Schema, Types } from 'mongoose';

import { PRESCRIPTION_FIELD_LIMITS, PRESCRIPTION_FREQUENCIES, PrescriptionFrequency } from '@/constants/prescription.const';

/**
 * A prescription, belonging to the encounter it was written in.
 *
 * There is no free-floating prescription: it hangs off an encounter, which hangs off an
 * appointment, which names a doctor and a patient. That chain is what makes it attributable.
 *
 * **Immutable once issued.** A change is a new prescription that supersedes this one, and
 * both stay on the timeline — because the pharmacy may already have dispensed against the
 * first, and a record that quietly becomes a different record is worse than two records.
 */
export type PrescriptionAttributes = {
  encounter: Types.ObjectId;
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  items: {
    /** Validated as text, not against a formulary — see the note on the constant. */
    drug: string;
    strength?: string;
    dose?: string;
    frequency: PrescriptionFrequency;
    duration?: string;
    instructions?: string;
  }[];
  advice?: string;
  issuedAt: Date;
  /** Set when a later prescription replaces this one. Both remain readable. */
  supersededBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PrescriptionEntity = PrescriptionAttributes & { _id: Types.ObjectId };

type PrescriptionModel = Model<PrescriptionAttributes>;

const prescriptionItemSchema = new Schema(
  {
    drug: { type: String, required: true, trim: true, maxlength: PRESCRIPTION_FIELD_LIMITS.DRUG },
    strength: { type: String, trim: true, maxlength: PRESCRIPTION_FIELD_LIMITS.STRENGTH },
    dose: { type: String, trim: true, maxlength: PRESCRIPTION_FIELD_LIMITS.DOSE },
    frequency: { type: String, required: true, enum: Object.values(PRESCRIPTION_FREQUENCIES) },
    duration: { type: String, trim: true, maxlength: PRESCRIPTION_FIELD_LIMITS.DURATION },
    instructions: { type: String, trim: true, maxlength: PRESCRIPTION_FIELD_LIMITS.INSTRUCTIONS },
  },
  { _id: false }
);

const prescriptionSchema = new Schema<PrescriptionAttributes, PrescriptionModel>(
  {
    encounter: { type: Schema.Types.ObjectId, ref: 'Encounter', required: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    items: {
      type: [prescriptionItemSchema],
      required: true,
      validate: [
        (value: unknown[]) => value.length > 0 && value.length <= PRESCRIPTION_FIELD_LIMITS.ITEMS,
        'A prescription needs at least one item, and no more than thirty.',
      ],
    },
    advice: { type: String, trim: true, maxlength: PRESCRIPTION_FIELD_LIMITS.ADVICE },
    issuedAt: { type: Date, required: true, default: Date.now },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  },
  { timestamps: true }
);

// A patient's prescriptions, newest first — the portal list and the timeline both want it.
prescriptionSchema.index({ patient: 1, issuedAt: -1 });
prescriptionSchema.index({ encounter: 1 });

export const Prescription =
  (mongoose.models.Prescription as PrescriptionModel) ??
  mongoose.model<PrescriptionAttributes, PrescriptionModel>('Prescription', prescriptionSchema);
