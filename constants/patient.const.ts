import { BloodGroup } from '@/types';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const satisfies readonly BloodGroup[];

/**
 * The medical record number's shape: a prefix, the year of registration, and a zero-padded
 * sequence — `HMS-2026-000417`.
 *
 * It is issued once and never changes: it is the identifier every clinical document hangs
 * off and the thing a person reads out at a counter, so it has to survive a name change, a
 * marriage and a new phone number. The issuer that mints it lands in step 7; the shape is
 * fixed here because the model has to index it before then.
 */
export const MEDICAL_RECORD_NO = {
  PREFIX: 'HMS',
  SEQUENCE_LENGTH: 6,
  PATTERN: /^HMS-\d{4}-\d{6}$/,
} as const;

export const PATIENT_FIELD_LIMITS = {
  /** One allergy or condition as written. Long enough for "penicillin (rash, 2019)". */
  CLINICAL_ENTRY: 120,
  /**
   * How many allergies or chronic conditions a record may list. A bound rather than
   * unlimited because these render on every clinical screen; a record with two hundred
   * entries is a data-entry accident, not a patient.
   */
  CLINICAL_ENTRIES: 40,
  ADDRESS: 250,
  CONTACT_NAME: 120,
  CONTACT_RELATION: 60,
} as const;
