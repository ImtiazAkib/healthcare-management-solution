/**
 * An encounter is open while the consultation is happening and completed afterwards.
 *
 * There is no `amended`. A completed encounter is never edited — a correction is a dated
 * addendum appended to it, which is why the model carries an `addenda` array rather than a
 * third status. A record that can be silently rewritten is not a record.
 */
export type EncounterStatus = 'open' | 'completed';
