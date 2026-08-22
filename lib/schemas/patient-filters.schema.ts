import { z } from 'zod';

/*
  The registry has one filter: a search box. It catches rather than throws, so a hand-edited
  query string degrades to the unfiltered list. There is deliberately no filter for a diagnosis
  or a condition — a search that finds "everyone with a condition" is a different feature with a
  different access rule, and it is not this one.
*/
export const PatientFiltersSchema = z.object({
  query: z.string().trim().max(120).catch('').default(''),
});

export type PatientFiltersInput = z.input<typeof PatientFiltersSchema>;
export type PatientFiltersOutput = z.output<typeof PatientFiltersSchema>;
