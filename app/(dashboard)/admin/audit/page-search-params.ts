import { createLoader, parseAsString } from 'nuqs/server';

import { AUDIT_OUTCOME_FILTERS } from '@/constants';

/*
  One definition of the trail's URL state, read from both sides: `AuditFilters` writes it with the
  client hooks, the page reads it on the server. Declaring it twice is how the two quietly drift apart.

  The values are parsed as plain strings here and validated by `AuditFiltersSchema`, which is where a
  nonsense `?outcome=maybe` falls back to the default.
*/
export const auditSearchParams = {
  outcome: parseAsString.withDefault(AUDIT_OUTCOME_FILTERS.ALL),
  query: parseAsString.withDefault(''),
};

export const loadAuditSearchParams = createLoader(auditSearchParams);
