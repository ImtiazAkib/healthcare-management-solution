import { PRESCRIPTION_FREQUENCIES } from '@/constants';

import type { PrescriptionFrequency } from '@/constants';

/**
 * The prescription record, as every screen in this feature reads it.
 */
export type { PrescriptionDto, PrescriptionItemDto } from '@/types';

/**
 * The prescription as the doctor's list and the detail/print views read them — the record with the
 * patient's identity and the prescriber's attached.
 *
 * Re-exported under the feature so its components share one name for each shape rather than each
 * reaching into the service layer for it.
 */
export type { PrescriptionRow, PrescriptionDetail } from '@/lib/services';

/**
 * How often a drug is taken, from the closed list.
 */
export type { PrescriptionFrequency } from '@/constants';

/**
 * The first frequency value, used to seed a fresh row's Select.
 */
export const DEFAULT_PRESCRIPTION_FREQUENCY = PRESCRIPTION_FREQUENCIES.ONCE_DAILY;

/**
 * One drug item as the repeatable field edits it: every part is a plain string so an empty row is a
 * valid in-progress state and a controlled input always has a value. The frequency starts at the
 * first value. The schema validates the rows on submit — unlike diagnoses, a blank drug row is not
 * dropped, since a half-filled row is somebody who was interrupted.
 */
export type PrescriptionItemRow = {
  drug: string;
  strength: string;
  dose: string;
  frequency: PrescriptionFrequency;
  duration: string;
  instructions: string;
};
