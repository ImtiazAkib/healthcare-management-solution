import { EncounterStatus } from '@/types';

export const ENCOUNTER_STATUSES = {
  OPEN: 'open',
  COMPLETED: 'completed',
} as const satisfies Record<string, EncounterStatus>;

export const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  open: 'Open',
  completed: 'Completed',
};

export const ENCOUNTER_FIELD_LIMITS = {
  CHIEF_COMPLAINT: 500,
  EXAMINATION: 2000,
  TREATMENT_NOTES: 4000,
  DIAGNOSIS_DESCRIPTION: 300,
  /**
   * A diagnosis code, if somebody has one to hand. **No coded vocabulary ships with this
   * app** — see the plan's backlog on ICD-10. A labelled free-text field beside an optional
   * code is honest; a half-built coding standard that silently mismatches is not.
   */
  DIAGNOSIS_CODE: 20,
  DIAGNOSES: 20,
  ADDENDUM: 2000,
} as const;

/**
 * Plausible ranges for a vitals reading, used to flag rather than to refuse.
 *
 * **These are adult ranges.** A child's are different and applying an adult band to a
 * six-year-old would mark a normal pulse as abnormal, which is worse than saying nothing —
 * the pediatric case is in the plan's backlog and the app says so rather than quietly
 * getting it wrong.
 *
 * The outer `MIN`/`MAX` on each is a validation bound: a temperature of 986 is a typo, and
 * catching it at the schema is the difference between a caught mistake and a clinical note
 * that reads as a medical emergency.
 */
export const VITALS_RANGES = {
  SYSTOLIC: { MIN: 50, MAX: 300, NORMAL_LOW: 90, NORMAL_HIGH: 120 },
  DIASTOLIC: { MIN: 20, MAX: 200, NORMAL_LOW: 60, NORMAL_HIGH: 80 },
  PULSE: { MIN: 20, MAX: 250, NORMAL_LOW: 60, NORMAL_HIGH: 100 },
  TEMPERATURE: { MIN: 25, MAX: 45, NORMAL_LOW: 36.1, NORMAL_HIGH: 37.2 },
  RESPIRATORY_RATE: { MIN: 4, MAX: 80, NORMAL_LOW: 12, NORMAL_HIGH: 20 },
  OXYGEN_SATURATION: { MIN: 50, MAX: 100, NORMAL_LOW: 95, NORMAL_HIGH: 100 },
  WEIGHT: { MIN: 0.5, MAX: 400 },
  HEIGHT: { MIN: 20, MAX: 260 },
} as const;
