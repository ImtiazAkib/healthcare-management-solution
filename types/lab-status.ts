/**
 * A diagnostic order from raised to readable.
 *
 * `reported` and `released` are deliberately different states. A report exists once the lab
 * has written it; it reaches the doctor and the patient only once somebody has verified and
 * released it. An unverified result in front of a patient is the failure the whole
 * diagnostics module is designed around.
 */
export type LabStatus = 'ordered' | 'collected' | 'in-progress' | 'reported' | 'released' | 'cancelled';

/** How soon the lab should get to it. `stat` is "now", in the hospital sense of the word. */
export type LabPriority = 'routine' | 'urgent' | 'stat';
