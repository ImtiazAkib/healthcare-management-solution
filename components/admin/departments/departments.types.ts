import type { HeadDoctorOption } from '@/lib/services';

/**
 * A doctor a department may be headed by, as offered to the create form and the edit dialog.
 *
 * Re-exported under the feature so its components share one name for the option shape rather
 * than each reaching into the service layer for it.
 */
export type DepartmentHeadOption = HeadDoctorOption;

/**
 * A lookup from a doctor's id to their display name, built once on the server from the
 * assignable-head options.
 *
 * The table row uses it to show a department's head by name without a second query. A head who
 * has since been deactivated is not in the assignable set, so the row falls back to "—" — the
 * same gap the reference screen carries, and a cosmetic one: the id is still stored.
 */
export type HeadDoctorNameMap = Record<string, string>;
