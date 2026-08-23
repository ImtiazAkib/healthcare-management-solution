import { createLoader, parseAsString } from 'nuqs/server';

/*
  One definition of the reporting window's URL state, read from both sides: `AnalyticsFilters` writes
  `from`/`to` with the client hooks, the page reads them on the server. Declaring it twice is how the
  two quietly drift apart.

  The values are parsed as plain strings here and validated by `AnalyticsRangeSchema`, which is where a
  hand-edited `?from=yesterday` falls back to empty — and the service reads empty as "the default
  window" rather than erroring.
*/
export const analyticsSearchParams = {
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
};

export const loadAnalyticsSearchParams = createLoader(analyticsSearchParams);
