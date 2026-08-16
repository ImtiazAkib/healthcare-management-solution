/**
 * Where an appointment is in its life.
 *
 * A closed set, and the schema only says which values exist — **which transitions are legal
 * is a service rule**, in step 9. A schema cannot express "cancelled is reachable before
 * check-in but not after", and a rule half-expressed in two places is a rule nobody trusts.
 */
export type AppointmentStatus = 'requested' | 'confirmed' | 'checked-in' | 'in-consultation' | 'completed' | 'cancelled' | 'no-show';
