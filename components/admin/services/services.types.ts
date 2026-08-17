import type { ServiceItemCreateInput } from '@/lib/schemas';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

/**
 * What the shared fields component needs from whichever form is hosting it.
 *
 * The create page and the edit dialog render the same five fields, so the inputs, the category
 * select and the error messages live in one component — `ServiceFields` — and each form hands
 * it these pieces of its own `useForm`. Both forms type that form on `ServiceItemCreateInput`:
 * the five editable fields are identical between create and edit, and the edit dialog carries
 * the service's id in a closure rather than as a form field, so the shape they share is exactly
 * the create input.
 */
export type ServiceFieldsProps = {
  /** Prefixes the element ids, so the page and the dialog do not collide on `name`, `code`, … */
  idPrefix: string;
  register: UseFormRegister<ServiceItemCreateInput>;
  control: Control<ServiceItemCreateInput>;
  errors: FieldErrors<ServiceItemCreateInput>;
};
