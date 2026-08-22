import { Counter } from '@/models/counter.model';

import { connectToDatabase } from '@/lib/mongodb';
import { formatMedicalRecordNo } from '@/lib/utils';

import type { CounterAttributes } from '@/models/counter.model';

/**
 * Mint the next medical record number.
 *
 * The sequence is taken from an **atomic counter**, not from a count of existing patients:
 * `findByIdAndUpdate(..., { $inc: { seq: 1 } })` is a single operation the database serializes,
 * so two registrations racing in the same instant are handed two consecutive numbers rather
 * than reading the same total and both minting it. The counter is keyed by year, so each year's
 * sequence starts again at one; the unique index on `medicalRecordNo` is the final backstop.
 *
 * Shared by both paths that create a patient record — reception at the counter here, and a
 * patient claiming a self-registered account in step 15 — so the two cannot drift into
 * producing different shapes or colliding sequences.
 *
 * A gap is acceptable: if the number is minted but the patient write then fails, the sequence
 * has still moved on, and a record number is an identifier, not a tally that must be contiguous.
 *
 * @returns The formatted record number, e.g. `HMS-2026-000417`.
 */
export async function issueMedicalRecordNo(): Promise<string> {
  await connectToDatabase();

  const year = new Date().getFullYear();
  const key = `patient-mrn-${year}`;

  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean<CounterAttributes | null>();

  // Upsert with `returnDocument: 'after'` always returns the document; the guard is for the type.
  if (!counter) {
    throw new Error(`Failed to advance the medical record counter "${key}".`);
  }

  return formatMedicalRecordNo(year, counter.seq);
}
