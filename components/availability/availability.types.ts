/**
 * A doctor a block may be published for, as offered to the create form's picker.
 *
 * Re-exported under the feature so its components share one name for the option shape rather
 * than each reaching into the service layer for it.
 */
export type { DoctorOption } from '@/lib/services';

/**
 * A lookup from a doctor's id to their display name, built once on the server from the
 * selection options.
 *
 * The admin week uses it to label each block's doctor without a second query. A doctor whose
 * account has since gone is not in the selection set, so a block falls back to "—" — a display
 * gap, not a lost link, since the id is still stored. The read-only doctor week hands an empty
 * map: a doctor is looking at their own hours and needs no name beside each one.
 */
export type DoctorNameMap = Record<string, string>;
