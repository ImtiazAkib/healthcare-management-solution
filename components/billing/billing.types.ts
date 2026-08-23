import type { ServiceCategory } from '@/types';

/**
 * A catalogue service as the create form's line picker needs it, and nothing more.
 *
 * The new-invoice page loads the active catalogue and passes it down; a picker needs the id it
 * submits, the code and name it shows, and the price it previews a line total with. It does not
 * need the description, the timestamps or the active flag — the invoice is priced server-side, so
 * the price carried here only feeds the on-screen preview, never the submitted payload.
 */
export type ServiceItemOption = {
  serviceItemId: string;
  code: string;
  name: string;
  category: ServiceCategory;
  priceMinorUnits: number;
};

/**
 * A patient as the create form's patient picker needs it — an id to submit, a name and a record
 * number to read. The registry list already hands back exactly this shape.
 */
export type PatientOption = {
  patientId: string;
  name: string;
  medicalRecordNo: string;
};
