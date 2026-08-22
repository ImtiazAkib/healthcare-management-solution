import { createLoader, parseAsString } from 'nuqs/server';

import { FILTER_ALL } from '@/constants/users.const';

/*
  One definition of the list's URL state, read from both sides: `AppointmentsFilters` writes it
  with the client hooks, the page reads it on the server. Declaring it twice is how the two
  quietly drift apart.

  The values are parsed as plain strings here and validated by `AppointmentFiltersSchema`, which
  is where a nonsense `?status=whenever` falls back to the default.
*/
export const appointmentsSearchParams = {
  doctorId: parseAsString.withDefault(FILTER_ALL),
  date: parseAsString.withDefault(''),
  status: parseAsString.withDefault(FILTER_ALL),
};

export const loadAppointmentsSearchParams = createLoader(appointmentsSearchParams);
