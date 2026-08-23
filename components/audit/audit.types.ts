import { AUDIT_OUTCOME_FILTERS } from '@/constants';

/**
 * The outcome the access trail is narrowed to: a specific outcome, or the shared "all" sentinel.
 *
 * Deriving the type from the constant keeps the filter component, its URL state and the schema
 * agreed on exactly one set of values — adding a fourth would be a single edit, not four.
 */
export type AuditOutcomeFilter = (typeof AUDIT_OUTCOME_FILTERS)[keyof typeof AUDIT_OUTCOME_FILTERS];
