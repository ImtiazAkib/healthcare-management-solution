import { z } from 'zod';

import { AUDIT_OUTCOME_FILTERS } from '@/constants/audit.const';

/*
  The access-trail screen's URL state. The outcome narrows to granted or refused; the query searches
  the actor's name. A malformed value falls back to "all" or empty rather than erroring, the same way
  the other admin filters degrade.
*/
export const AuditFiltersSchema = z.object({
  outcome: z.enum(Object.values(AUDIT_OUTCOME_FILTERS)).catch(AUDIT_OUTCOME_FILTERS.ALL).default(AUDIT_OUTCOME_FILTERS.ALL),
  query: z.string().trim().max(120).catch('').default(''),
});

export type AuditFiltersInput = z.input<typeof AuditFiltersSchema>;
export type AuditFiltersOutput = z.output<typeof AuditFiltersSchema>;
