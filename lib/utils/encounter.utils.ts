import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';

import type { EncounterStatus } from '@/types';

/**
 * Whether an encounter's fields may still be edited.
 *
 * Only an open encounter is editable; a completed one is a record, corrected by a dated addendum
 * rather than an overwrite. The screen reads this to offer editing or an addendum, and the service
 * enforces it — this is the convenience, the service is the rule.
 *
 * @param status - The encounter's status.
 *
 * @returns True while the encounter is open.
 */
export function isEncounterEditable(status: EncounterStatus): boolean {
  return status === ENCOUNTER_STATUSES.OPEN;
}
