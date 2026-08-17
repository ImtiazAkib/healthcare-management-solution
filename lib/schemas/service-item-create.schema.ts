import { z } from 'zod';

import { SERVICE_CATEGORIES, SERVICE_CODE_PATTERN, SERVICE_FIELD_LIMITS, SERVICE_PRICE_MAX_MINOR_UNITS } from '@/constants/service.const';

import { toMinorUnits } from '@/lib/utils';

/*
  Plain messages rather than encoded codes, like the department schema: an uncoded message
  decodes to code 0 and still renders. The service raises coded errors only for the clashes and
  the missing row.
*/
export const serviceFields = {
  name: z.string().trim().min(1, 'Service name is required.').max(SERVICE_FIELD_LIMITS.NAME, 'Service name is too long.'),

  code: z.string().trim().toUpperCase().min(1, 'Service code is required.').regex(SERVICE_CODE_PATTERN, 'Use 2–16 letters or digits, e.g. CBC.'),

  category: z.enum(Object.values(SERVICE_CATEGORIES), 'Choose a valid service category.'),

  description: z.string().trim().max(SERVICE_FIELD_LIMITS.DESCRIPTION, 'Description is too long.'),

  /*
    Arrives as the major-unit text a person types (`'500.50'`) and leaves as an integer count
    of minor units (`50050`). Accepts a number too, so re-validating the schema's own output in
    a Server Action does not fail on the second pass — the same idempotence `phone` needs, and
    the mirror of the doctor fee, which differs only in that it takes whole minor units already.

    `toMinorUnits` hands back `NaN` for anything that is not a valid amount, which the integer
    refine turns into "Enter a valid price." rather than storing a broken number.
  */
  price: z
    .union([z.number(), z.string().trim()])
    .transform(value => (typeof value === 'string' ? toMinorUnits(value) : value))
    .refine(value => Number.isInteger(value), 'Enter a valid price.')
    .refine(value => value >= 0, 'A price cannot be negative.')
    .refine(value => value <= SERVICE_PRICE_MAX_MINOR_UNITS, 'Check the price — that is unusually large.'),
};

export const ServiceItemCreateSchema = z.object({
  name: serviceFields.name,
  code: serviceFields.code,
  category: serviceFields.category,
  description: serviceFields.description.optional().or(z.literal('')),
  price: serviceFields.price,
});

export type ServiceItemCreateInput = z.input<typeof ServiceItemCreateSchema>;
export type ServiceItemCreateOutput = z.output<typeof ServiceItemCreateSchema>;
