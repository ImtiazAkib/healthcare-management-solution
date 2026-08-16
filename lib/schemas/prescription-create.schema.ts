import { z } from 'zod';

import { PRESCRIPTION_FIELD_LIMITS, PRESCRIPTION_FREQUENCIES } from '@/constants/prescription.const';

import { objectIdField } from './object-id.schema';

export const prescriptionFields = {
  drug: z.string().trim().min(1, 'Name the drug.').max(PRESCRIPTION_FIELD_LIMITS.DRUG, 'That name is too long.'),
  strength: z.string().trim().max(PRESCRIPTION_FIELD_LIMITS.STRENGTH, 'That strength is too long.'),
  dose: z.string().trim().max(PRESCRIPTION_FIELD_LIMITS.DOSE, 'That dose is too long.'),
  frequency: z.enum(Object.values(PRESCRIPTION_FREQUENCIES), 'Choose how often it is taken.'),
  duration: z.string().trim().max(PRESCRIPTION_FIELD_LIMITS.DURATION, 'That duration is too long.'),
  instructions: z.string().trim().max(PRESCRIPTION_FIELD_LIMITS.INSTRUCTIONS, 'Those instructions are too long.'),
  advice: z.string().trim().max(PRESCRIPTION_FIELD_LIMITS.ADVICE, 'That advice is too long.'),
};

const prescriptionItem = z.object({
  drug: prescriptionFields.drug,
  strength: prescriptionFields.strength.optional().or(z.literal('')),
  dose: prescriptionFields.dose.optional().or(z.literal('')),
  frequency: prescriptionFields.frequency,
  duration: prescriptionFields.duration.optional().or(z.literal('')),
  instructions: prescriptionFields.instructions.optional().or(z.literal('')),
});

/*
  Like the encounter, this takes the encounter id and nothing else identifying: the patient
  and the doctor come from that record. A prescription that named its own patient would be a
  prescription anybody could write for anybody.

  At least one item, because an empty prescription is not a prescription — and unlike the
  diagnosis list, a blank row here is not silently dropped: a half-filled drug row is
  somebody who was interrupted, and dropping it would issue a prescription missing a drug
  they meant to include.
*/
export const PrescriptionCreateSchema = z.object({
  encounterId: objectIdField,
  items: z
    .array(prescriptionItem)
    .min(1, 'Add at least one drug.')
    .max(PRESCRIPTION_FIELD_LIMITS.ITEMS, 'That is more items than one prescription should carry.'),
  advice: prescriptionFields.advice.optional().or(z.literal('')),
});

export type PrescriptionCreateInput = z.input<typeof PrescriptionCreateSchema>;
export type PrescriptionCreateOutput = z.output<typeof PrescriptionCreateSchema>;
