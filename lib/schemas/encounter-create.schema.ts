import { z } from 'zod';

import { ENCOUNTER_FIELD_LIMITS } from '@/constants/encounter.const';

import { scheduleFields } from './availability-create.schema';
import { objectIdField } from './object-id.schema';

export const encounterFields = {
  chiefComplaint: z.string().trim().max(ENCOUNTER_FIELD_LIMITS.CHIEF_COMPLAINT, 'Keep the complaint under 500 characters.'),
  examination: z.string().trim().max(ENCOUNTER_FIELD_LIMITS.EXAMINATION, 'Examination notes are too long.'),
  treatmentNotes: z.string().trim().max(ENCOUNTER_FIELD_LIMITS.TREATMENT_NOTES, 'Treatment notes are too long.'),

  /*
    Blank rows are dropped rather than refused — a repeatable field starts with an empty row
    and that is not a mistake. A row with a code but no description is refused, because a
    bare code is not a diagnosis anybody can read.
  */
  diagnoses: z
    .array(
      z.object({
        description: z.string().trim().max(ENCOUNTER_FIELD_LIMITS.DIAGNOSIS_DESCRIPTION, 'That diagnosis is too long.'),
        code: z.string().trim().max(ENCOUNTER_FIELD_LIMITS.DIAGNOSIS_CODE, 'That code is too long.').optional().or(z.literal('')),
      })
    )
    .transform(values => values.filter(x => x.description !== ''))
    .pipe(
      z
        .array(z.object({ description: z.string().min(1), code: z.string().optional() }))
        .max(ENCOUNTER_FIELD_LIMITS.DIAGNOSES, 'That is more diagnoses than one encounter should carry.')
    ),
};

/*
  An encounter is opened **from an appointment**, never created free-standing: the
  appointment is what names the patient and the doctor, and taking those from the caller
  instead would let a request write a consultation into somebody else's record.
*/
export const EncounterCreateSchema = z.object({
  appointmentId: objectIdField,
  chiefComplaint: encounterFields.chiefComplaint.optional().or(z.literal('')),
});

export type EncounterCreateInput = z.input<typeof EncounterCreateSchema>;
export type EncounterCreateOutput = z.output<typeof EncounterCreateSchema>;

/** Editing an open encounter. The service refuses this once it is completed. */
export const EncounterUpdateSchema = z.object({
  encounterId: objectIdField,
  chiefComplaint: encounterFields.chiefComplaint.optional().or(z.literal('')),
  examination: encounterFields.examination.optional().or(z.literal('')),
  diagnoses: encounterFields.diagnoses.optional(),
  treatmentNotes: encounterFields.treatmentNotes.optional().or(z.literal('')),
  followUpDate: scheduleFields.calendarDate.optional().or(z.literal('')),
});

export type EncounterUpdateInput = z.input<typeof EncounterUpdateSchema>;
export type EncounterUpdateOutput = z.output<typeof EncounterUpdateSchema>;

/**
 * The correction path for a completed encounter.
 *
 * A separate schema rather than a flag on the update, because it is a different act: an
 * addendum is added, it is attributed and dated, and it never replaces what was written.
 */
export const EncounterAddendumSchema = z.object({
  encounterId: objectIdField,
  note: z.string().trim().min(1, 'Write the correction.').max(ENCOUNTER_FIELD_LIMITS.ADDENDUM, 'That addendum is too long.'),
});

export type EncounterAddendumInput = z.input<typeof EncounterAddendumSchema>;
export type EncounterAddendumOutput = z.output<typeof EncounterAddendumSchema>;

/** Completing an encounter — an id and nothing else; which move is legal is the service's rule. */
export const EncounterCompleteSchema = z.object({ encounterId: objectIdField });

export type EncounterCompleteInput = z.input<typeof EncounterCompleteSchema>;
export type EncounterCompleteOutput = z.output<typeof EncounterCompleteSchema>;
