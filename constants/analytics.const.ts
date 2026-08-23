/**
 * Reporting-window policy.
 *
 * An analytics page with no range asks for the last `DEFAULT_RANGE_DAYS`. The `MAX_RANGE_DAYS` bound
 * is a guard against a hand-edited URL asking for years at once — every query is an aggregation, but
 * a bound keeps even those honest.
 */
export const ANALYTICS = {
  DEFAULT_RANGE_DAYS: 30,
  MAX_RANGE_DAYS: 366,
  /** How many rows the "per doctor" and "per department" breakdowns show before the tail is dropped. */
  BREAKDOWN_LIMIT: 12,
} as const;
