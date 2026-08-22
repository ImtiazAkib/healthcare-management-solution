import { MEDICAL_RECORD_NO } from '@/constants/patient.const';

/*
  Imported from the constant module directly rather than through `@/constants`, so this stays
  safe to pull into a client bundle — the same reason `phone.utils.ts` and `money.utils.ts`
  reach past the barrel.
*/

/**
 * Assemble a medical record number from its parts — `HMS-2026-000417`.
 *
 * Kept apart from the issuer that decides *which* number, so the shape can be read and tested
 * without a database, and so the two paths that mint one (reception here, self-registration in
 * step 15) format it the same way.
 *
 * @param year - The year of registration.
 * @param sequence - Position within that year, from 1.
 *
 * @returns The formatted record number.
 */
export function formatMedicalRecordNo(year: number, sequence: number): string {
  const padded = String(sequence).padStart(MEDICAL_RECORD_NO.SEQUENCE_LENGTH, '0');

  return `${MEDICAL_RECORD_NO.PREFIX}-${year}-${padded}`;
}

/**
 * Whole years between a date of birth and today.
 *
 * Subtracts a year when this year's birthday has not arrived yet, so someone born in December
 * is not aged up on the first of January. Returns 0 for a future date rather than a negative
 * age — a mistyped year is a data problem, not a person who is minus three.
 *
 * A date of birth is stored as **UTC midnight** (a `YYYY-MM-DD` parsed as UTC), so the birthday's
 * calendar values are read with `getUTC*`. Reading the local `getDate()` off that instant would
 * land on the previous day in any timezone behind UTC, ageing a person up one day early on their
 * birthday. "Today" is read locally — the day the person at the desk is living in.
 *
 * @param dateOfBirth - The date of birth, as a `Date` or an ISO string.
 *
 * @returns The age in whole years, never below zero.
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const birth = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();

  let age = today.getFullYear() - birth.getUTCFullYear();
  const monthDelta = today.getMonth() - birth.getUTCMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return Math.max(0, age);
}
