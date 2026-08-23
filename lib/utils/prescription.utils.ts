import { PRESCRIPTION_FREQUENCY_LABELS } from '@/constants/prescription.const';

import type { PrescriptionDto, PrescriptionItemDto } from '@/types';

/**
 * A prescription is superseded once a later one has replaced it.
 *
 * @param prescription - The prescription to check.
 *
 * @returns True when a replacement exists.
 */
export function isPrescriptionSuperseded(prescription: Pick<PrescriptionDto, 'supersededById'>): boolean {
  return Boolean(prescription.supersededById);
}

/**
 * One drug item as a single readable line — drug, strength, dose, how often, and for how long —
 * with the parts that were left blank omitted rather than shown as gaps.
 *
 * The frequency is the one coded field, so it is turned into its label here; everything else is the
 * free text the doctor typed. Used where a full item table would be too much (a list row, a
 * timeline entry), never as a replacement for the printed sheet.
 *
 * @param item - The prescription item.
 *
 * @returns The item as a compact line.
 */
export function summarizePrescriptionItem(item: PrescriptionItemDto): string {
  const head = [item.drug, item.strength].filter(Boolean).join(' ');
  const tail = [item.dose, PRESCRIPTION_FREQUENCY_LABELS[item.frequency], item.duration].filter(Boolean).join(', ');

  return tail ? `${head} — ${tail}` : head;
}
