import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { formatShortDate } from '@/lib/utils';

import { Badge } from '@/components/ui';

import { EncounterStatusBadge } from './encounter-status.badge';

import type { TimelineEntry } from './encounters.types';

type EncounterTimelineRowProps = {
  entry: TimelineEntry;
};

/*
  One visit on the timeline, the whole row a link into the encounter. It reads at a glance — the
  date, the doctor who saw the patient, the complaint the visit opened on, the diagnoses as chips
  and where the encounter sits — so the record can be skimmed before any one entry is opened.
*/
export function EncounterTimelineRow({ entry }: EncounterTimelineRowProps) {
  return (
    <li>
      <Link
        href={`/doctor/encounters/${entry.encounterId}`}
        className="border-border hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-4 transition-colors">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium whitespace-nowrap">{formatShortDate(entry.createdAt)}</span>
            <span className="text-muted-foreground text-sm">{entry.doctorName}</span>
            <EncounterStatusBadge status={entry.status} />
          </div>

          <p className="text-sm wrap-break-word">
            {entry.chiefComplaint ? entry.chiefComplaint : <span className="text-muted-foreground">No chief complaint recorded</span>}
          </p>

          {entry.diagnoses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.diagnoses.map((diagnosis, index) => (
                <Badge key={`${index}-${diagnosis.description}`} variant="outline">
                  {diagnosis.description}
                  {diagnosis.code ? <span className="text-muted-foreground ml-1 font-mono text-xs">{diagnosis.code}</span> : null}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
