import { createLoader, parseAsString } from 'nuqs/server';

import { FILTER_ALL } from '@/constants/users.const';

/*
  One definition of the screen's URL state, read from both sides: `DepartmentsFilters` writes
  it with the client hooks, the page reads it on the server. Declaring it twice is how the two
  quietly drift apart.

  The values are parsed as plain strings here and validated by `DepartmentFiltersSchema`, which
  is where a nonsense `?status=retired` falls back to the default.
*/
export const departmentsSearchParams = {
  status: parseAsString.withDefault(FILTER_ALL),
  query: parseAsString.withDefault(''),
};

export const loadDepartmentsSearchParams = createLoader(departmentsSearchParams);
