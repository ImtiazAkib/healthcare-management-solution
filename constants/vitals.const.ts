import { TriagePriority } from '@/types';

/**
 * The vitals readings, in the order a form and a summary both show them, with the unit each is
 * recorded in and a sensible input step. Which readings have a normal range to flag against is not
 * repeated here — it is derived from `VITALS_RANGES` by `flagVital`, the one source for the bands.
 */
export type VitalsReadingKey = 'systolic' | 'diastolic' | 'pulse' | 'temperature' | 'respiratoryRate' | 'oxygenSaturation' | 'weight' | 'height';

export const VITALS_READINGS: { key: VitalsReadingKey; label: string; unit: string; step: number }[] = [
  { key: 'systolic', label: 'Systolic', unit: 'mmHg', step: 1 },
  { key: 'diastolic', label: 'Diastolic', unit: 'mmHg', step: 1 },
  { key: 'pulse', label: 'Pulse', unit: 'bpm', step: 1 },
  { key: 'temperature', label: 'Temperature', unit: '°C', step: 0.1 },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: '/min', step: 1 },
  { key: 'oxygenSaturation', label: 'Oxygen saturation', unit: '%', step: 1 },
  { key: 'weight', label: 'Weight', unit: 'kg', step: 0.1 },
  { key: 'height', label: 'Height', unit: 'cm', step: 0.1 },
];

/** The chip color for each triage priority, so urgency reads at a glance down the queue. */
export const TRIAGE_PRIORITY_VARIANTS: Record<TriagePriority, 'destructive' | 'warning' | 'neutral'> = {
  emergency: 'destructive',
  urgent: 'warning',
  routine: 'neutral',
};

/** Readable labels for the BMI bands `bmiCategory` returns. */
export const BMI_CATEGORY_LABELS: Record<'underweight' | 'normal' | 'overweight' | 'obese', string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
};
