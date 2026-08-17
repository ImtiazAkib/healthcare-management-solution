/**
 * What a priced service is, for grouping the catalogue and driving its category filter.
 *
 * A closed set of lowercase literals, the same shape every other union in this folder takes.
 * The values a service may hold are said here; which of them a screen offers, and how each is
 * labelled, live in `constants/service.const.ts`; the pricing rules that read the category
 * arrive with billing in step 19.
 */
export type ServiceCategory = 'consultation' | 'lab' | 'procedure' | 'bed' | 'pharmacy';
