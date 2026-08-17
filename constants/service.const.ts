import { FILTER_ALL } from '@/constants/users.const';

import type { ServiceCategory } from '@/types';

/**
 * Field lengths for a catalogue service, applied in both the zod schema and the Mongoose
 * schema — the same reason the account and department limits are declared once and used twice.
 */
export const SERVICE_FIELD_LIMITS = {
  NAME: 120,
  CODE: 16,
  DESCRIPTION: 500,
} as const;

/**
 * A service code as it is stored: letters and digits, upper-cased — `CBC`, `XRAY`, `CONSULT`.
 * Short and typeable, because it is what a lab order line and an invoice line refer to.
 */
export const SERVICE_CODE_PATTERN = /^[A-Z0-9]{2,16}$/;

/**
 * The ceiling on a price, in minor units — a sibling of `CONSULTATION_FEE_MAX_MINOR_UNITS`.
 * It is a sanity bound against a price typed in the wrong unit, not a claim about real prices.
 */
export const SERVICE_PRICE_MAX_MINOR_UNITS = 100_000_000;

/**
 * The five things a hospital charges for. A consultation links to a department, a lab test is
 * what a lab order refers to, and every one of them is what an invoice line prices — but those
 * relationships live in the features that draw on the catalogue, not here.
 */
export const SERVICE_CATEGORIES = {
  CONSULTATION: 'consultation',
  LAB: 'lab',
  PROCEDURE: 'procedure',
  BED: 'bed',
  PHARMACY: 'pharmacy',
} as const satisfies Record<string, ServiceCategory>;

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultation: 'Consultation',
  lab: 'Lab test',
  procedure: 'Procedure',
  bed: 'Bed / admission',
  pharmacy: 'Pharmacy',
};

/** The catalogue's category filter — the five categories plus the shared "all" sentinel. */
export const SERVICE_CATEGORY_FILTERS = {
  ALL: FILTER_ALL,
  CONSULTATION: 'consultation',
  LAB: 'lab',
  PROCEDURE: 'procedure',
  BED: 'bed',
  PHARMACY: 'pharmacy',
} as const;

/**
 * A service is either offered or retired — there is no third state, unlike an account. The
 * filter is the same two flags the table shows a badge for.
 */
export const SERVICE_STATUS_FILTERS = {
  ALL: FILTER_ALL,
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
