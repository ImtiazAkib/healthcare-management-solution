/**
 * One set of vitals, as recorded at check-in.
 *
 * A value object rather than a document: it belongs to the visit it was taken at, is read
 * whenever that visit is, and is never queried on its own. It carries **who recorded it and
 * when** because a reading with no provenance is not a clinical record — the same reading
 * means different things taken by a nurse at triage and taken again an hour later.
 *
 * Every field is optional. A nurse who took a blood pressure and a temperature has recorded
 * vitals; requiring all seven would push them to invent the rest.
 */
export type Vitals = {
  /** Systolic over diastolic, in mmHg, kept apart so each can be range-checked. */
  systolic?: number | null;
  diastolic?: number | null;
  /** Beats per minute. */
  pulse?: number | null;
  /** Degrees Celsius. */
  temperature?: number | null;
  /** Breaths per minute. */
  respiratoryRate?: number | null;
  /** Oxygen saturation, as a percentage. */
  oxygenSaturation?: number | null;
  /** Kilograms. */
  weight?: number | null;
  /** Centimeters. */
  height?: number | null;
  recordedBy: string;
  recordedAt: string;
};
