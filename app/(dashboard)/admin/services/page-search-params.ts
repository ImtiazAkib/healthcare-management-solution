import { createLoader, parseAsString } from 'nuqs/server';

import { FILTER_ALL } from '@/constants/users.const';

/*
  One definition of the screen's URL state, read from both sides: `ServicesFilters` writes it
  with the client hooks, the page reads it on the server. Declaring it twice is how the two
  quietly drift apart.

  The values are parsed as plain strings here and validated by `ServiceItemFiltersSchema`,
  which is where a nonsense `?category=potions` falls back to the default.
*/
export const servicesSearchParams = {
  category: parseAsString.withDefault(FILTER_ALL),
  status: parseAsString.withDefault(FILTER_ALL),
  query: parseAsString.withDefault(''),
};

export const loadServicesSearchParams = createLoader(servicesSearchParams);
