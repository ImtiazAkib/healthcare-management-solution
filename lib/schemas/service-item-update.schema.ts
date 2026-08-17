import { z } from 'zod';

import { objectIdField } from './object-id.schema';
import { serviceFields } from './service-item-create.schema';

/*
  The code and the price are both editable — a service is a thing the hospital named and priced
  for itself, and correcting either is a real need. What references a service is its id.
*/
export const ServiceItemUpdateSchema = z.object({
  serviceItemId: objectIdField,
  name: serviceFields.name,
  code: serviceFields.code,
  category: serviceFields.category,
  description: serviceFields.description.optional().or(z.literal('')),
  price: serviceFields.price,
});

export type ServiceItemUpdateInput = z.input<typeof ServiceItemUpdateSchema>;
export type ServiceItemUpdateOutput = z.output<typeof ServiceItemUpdateSchema>;
