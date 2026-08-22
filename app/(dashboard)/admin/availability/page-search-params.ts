import { createLoader, parseAsString } from 'nuqs/server';

import { FILTER_ALL } from '@/constants/users.const';

/*
  One definition of the week's URL state, read from both sides: `AvailabilityFilters` writes it
  with the client hooks, the page reads it on the server. Declaring it twice is how the two
  quietly drift apart.

  The values are parsed as plain strings here and validated by `AvailabilityFiltersSchema`, which
  is where a nonsense `?dayOfWeek=someday` falls back to the default.
*/
export const availabilitySearchParams = {
  doctorId: parseAsString.withDefault(FILTER_ALL),
  dayOfWeek: parseAsString.withDefault(FILTER_ALL),
  status: parseAsString.withDefault(FILTER_ALL),
};

export const loadAvailabilitySearchParams = createLoader(availabilitySearchParams);
