import { FileText } from 'lucide-react';

import { formatShortDate } from '@/lib/utils';

import { Badge } from '@/components/ui';

import { PatientPortalEmpty } from './patient-portal-empty';

import type { PatientTimelineProps } from './patient.types';

/*
  The patient's own visit history — their completed encounters, newest first. It reads the same
  shape as the clinical timeline staff see, minus the link: the portal has no encounter detail page,
  so each visit is a flat card of the date, who saw them, the complaint the visit opened on and the
  diagnoses as chips, never a doorway into the note itself.
*/
export function PatientTimeline({ entries }: PatientTimelineProps) {
  if (entries.length === 0) {
    return (
      <PatientPortalEmpty
        icon={FileText}
        title="No visits recorded yet"
        description="When you are seen in a consultation, the completed visit is recorded here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map(entry => (
        <li key={entry.encounterId} className="border-border flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium whitespace-nowrap">{formatShortDate(entry.createdAt)}</span>
            <span className="text-muted-foreground text-sm">{entry.doctorName}</span>
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
        </li>
      ))}
    </ul>
  );
}
