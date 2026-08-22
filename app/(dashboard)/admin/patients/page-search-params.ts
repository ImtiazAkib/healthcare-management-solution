import { createLoader, parseAsString } from 'nuqs/server';

/*
  One definition of the registry's URL state, read from both sides: `PatientsFilters` writes it
  with the client hooks, the page reads it on the server. The value is parsed as a plain string
  and validated by `PatientFiltersSchema`.
*/
export const patientsSearchParams = {
  query: parseAsString.withDefault(''),
};

export const loadPatientsSearchParams = createLoader(patientsSearchParams);
