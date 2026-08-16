import { z } from 'zod';

import { VITALS_RANGES } from '@/constants/encounter.const';

import { objectIdField } from './object-id.schema';

/**
 * One optional reading, bounded to something a human body can produce.
 *
 * Blank is not zero. An untouched box submits an empty string and means "not taken", which
 * is a real and common state — coercing it to 0 would record a patient with no pulse.
 *
 * @param bounds - The plausible range for this reading.
 * @param message - What to say when the value is outside it.
 *
 * @returns A schema accepting a number, a numeric string, or nothing.
 */
function readingField(bounds: { MIN: number; MAX: number }, message: string) {
  return z
    .union([z.number(), z.string().trim()])
    .transform(value => (value === '' || value === undefined ? undefined : Number(value)))
    .refine(value => value === undefined || !Number.isNaN(value), 'Enter a number.')
    .refine(value => value === undefined || (value >= bounds.MIN && value <= bounds.MAX), message);
}

/*
  The bounds refuse a typo; they do not diagnose. A reading inside the plausible range but
  outside the reference range is flagged by the UI in step 14 and says nothing about what it
  means — and the reference ranges are adult ones, which the app states rather than hides.
*/
export const VitalsRecordSchema = z.object({
  appointmentId: objectIdField,
  systolic: readingField(VITALS_RANGES.SYSTOLIC, 'Check the systolic reading.').optional(),
  diastolic: readingField(VITALS_RANGES.DIASTOLIC, 'Check the diastolic reading.').optional(),
  pulse: readingField(VITALS_RANGES.PULSE, 'Check the pulse.').optional(),
  temperature: readingField(VITALS_RANGES.TEMPERATURE, 'Check the temperature — it should be in Celsius.').optional(),
  respiratoryRate: readingField(VITALS_RANGES.RESPIRATORY_RATE, 'Check the respiratory rate.').optional(),
  oxygenSaturation: readingField(VITALS_RANGES.OXYGEN_SATURATION, 'Check the oxygen saturation.').optional(),
  weight: readingField(VITALS_RANGES.WEIGHT, 'Check the weight — it should be in kilograms.').optional(),
  height: readingField(VITALS_RANGES.HEIGHT, 'Check the height — it should be in centimeters.').optional(),
});

export type VitalsRecordInput = z.input<typeof VitalsRecordSchema>;
export type VitalsRecordOutput = z.output<typeof VitalsRecordSchema>;
