import { EncounterTimelineRow } from './encounter-timeline-row';
import { EncountersEmpty } from './encounters-empty';

import type { TimelineEntry } from './encounters.types';

type EncounterTimelineProps = {
  /** The patient's encounters, newest first — the service sorts them. */
  entries: TimelineEntry[];
};

/*
  A patient's clinical timeline: their encounters, newest first, each row a link into the visit.
  This is the read side of the record — the writing happens inside an encounter — so it composes
  the rows and the empty state and holds no state of its own.
*/
export function EncounterTimeline({ entries }: EncounterTimelineProps) {
  if (entries.length === 0) {
    return <EncountersEmpty />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map(entry => (
        <EncounterTimelineRow key={entry.encounterId} entry={entry} />
      ))}
    </ul>
  );
}
