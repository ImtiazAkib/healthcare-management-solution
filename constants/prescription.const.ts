/**
 * How often a drug is taken, from a closed list.
 *
 * A closed list rather than free text because `1+0+1` and `twice daily` and `BD` all mean
 * the same thing, and a system that stores all three cannot count, remind or check anything.
 * The label is what prints; the value is what is stored.
 */
export const PRESCRIPTION_FREQUENCIES = {
  ONCE_DAILY: 'once-daily',
  TWICE_DAILY: 'twice-daily',
  THREE_TIMES_DAILY: 'three-times-daily',
  FOUR_TIMES_DAILY: 'four-times-daily',
  EVERY_OTHER_DAY: 'every-other-day',
  WEEKLY: 'weekly',
  AS_NEEDED: 'as-needed',
  AT_NIGHT: 'at-night',
  BEFORE_MEALS: 'before-meals',
  AFTER_MEALS: 'after-meals',
} as const;

export type PrescriptionFrequency = (typeof PRESCRIPTION_FREQUENCIES)[keyof typeof PRESCRIPTION_FREQUENCIES];

export const PRESCRIPTION_FREQUENCY_LABELS: Record<PrescriptionFrequency, string> = {
  'once-daily': 'Once daily',
  'twice-daily': 'Twice daily',
  'three-times-daily': 'Three times daily',
  'four-times-daily': 'Four times daily',
  'every-other-day': 'Every other day',
  weekly: 'Weekly',
  'as-needed': 'As needed',
  'at-night': 'At night',
  'before-meals': 'Before meals',
  'after-meals': 'After meals',
} as const;

export const PRESCRIPTION_FIELD_LIMITS = {
  /**
   * The drug as written. **No formulary ships with this app** — the name is validated as
   * text, not against a drug database. Interaction checking needs a licensed dataset, and a
   * half-built one that misses an interaction is worse than none; it is in the backlog.
   */
  DRUG: 200,
  STRENGTH: 60,
  DOSE: 60,
  DURATION: 60,
  INSTRUCTIONS: 300,
  ADVICE: 1000,
  ITEMS: 30,
} as const;
