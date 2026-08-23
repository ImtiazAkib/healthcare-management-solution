/**
 * The encounter record, as every screen in this feature reads it.
 */
export type { EncounterDto } from '@/types';

/**
 * The encounter as the detail screen reads it — the record with each addendum's author named.
 *
 * Re-exported under the feature so its components share one name for the shape rather than each
 * reaching into the service layer for it.
 */
export type { EncounterDetail } from '@/lib/services';

/**
 * The vitals recorded at check-in, shown read-only beside the consultation.
 */
export type { Vitals } from '@/types';

/**
 * One entry in a patient's clinical timeline — an encounter with the doctor's name attached.
 *
 * Re-exported under the feature so its components share one name for the shape rather than each
 * reaching into the service layer for it.
 */
export type { TimelineEntry } from '@/lib/services';

/**
 * A patient as a list row shows them.
 */
export type { PatientSummaryDto } from '@/types';

/**
 * One diagnosis row as the repeatable field edits it: both parts are plain strings so an empty
 * row is a valid in-progress state. The schema drops the blank rows and refuses a code with no
 * description when the form is submitted.
 */
export type DiagnosisRow = {
  description: string;
  code: string;
};
