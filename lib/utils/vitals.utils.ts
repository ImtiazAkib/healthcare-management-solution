import { VITALS_RANGES } from '@/constants/encounter.const';

/*
  Whether a vitals reading sits inside its normal band, so a panel can mark it rather than judge
  it. These are **adult** ranges (see the constant), so this flags for attention, never diagnoses —
  a reading outside the band is worth a second look, not an alarm the software raises on its own.

  Weight and height carry no normal band, only a sanity bound in the schema, so they are not
  banded here: there is no "abnormal" weight to mark, only a range of humans.
*/

/** Where a reading sits relative to its adult normal range. */
export type VitalsFlag = 'low' | 'normal' | 'high';

const NORMAL_RANGES = {
  systolic: VITALS_RANGES.SYSTOLIC,
  diastolic: VITALS_RANGES.DIASTOLIC,
  pulse: VITALS_RANGES.PULSE,
  temperature: VITALS_RANGES.TEMPERATURE,
  respiratoryRate: VITALS_RANGES.RESPIRATORY_RATE,
  oxygenSaturation: VITALS_RANGES.OXYGEN_SATURATION,
} as const;

/** The readings that have a normal band to check a value against. */
export type BandedVital = keyof typeof NORMAL_RANGES;

/**
 * Flag a vitals reading against its adult normal range.
 *
 * @param reading - Which reading it is.
 * @param value - The recorded value, or null/undefined when it was not taken.
 *
 * @returns Where it sits, or null when there is nothing to judge (not taken).
 */
export function flagVital(reading: BandedVital, value: number | null | undefined): VitalsFlag | null {
  if (value === null || value === undefined) {
    return null;
  }

  const range = NORMAL_RANGES[reading];

  if (value < range.NORMAL_LOW) {
    return 'low';
  }

  if (value > range.NORMAL_HIGH) {
    return 'high';
  }

  return 'normal';
}

/** A body-mass-index band. Adult, informational — a label beside the reading, not a diagnosis. */
export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

/**
 * Body mass index from weight and height, or null when either is missing.
 *
 * Weight is kilograms and height centimeters — the units the vitals are recorded in — so the height
 * is converted to metres here. A reading with no weight or no height has no BMI to compute.
 *
 * @param weightKg - Weight in kilograms, or null/undefined.
 * @param heightCm - Height in centimeters, or null/undefined.
 *
 * @returns The BMI rounded to one decimal, or null.
 */
export function computeBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (weightKg === null || weightKg === undefined || heightCm === null || heightCm === undefined || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;

  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * The adult band a BMI falls in — the standard WHO cut-offs. Informational, like {@link flagVital}.
 *
 * @param bmi - A BMI value, or null.
 *
 * @returns The category, or null when there is no BMI.
 */
export function bmiCategory(bmi: number | null): BmiCategory | null {
  if (bmi === null) {
    return null;
  }

  if (bmi < 18.5) {
    return 'underweight';
  }

  if (bmi < 25) {
    return 'normal';
  }

  if (bmi < 30) {
    return 'overweight';
  }

  return 'obese';
}
