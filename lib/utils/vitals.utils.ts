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
