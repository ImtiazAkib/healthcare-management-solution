import { APPOINTMENT_STATUS_LABELS } from '@/constants';

import { formatShortDate } from '@/lib/utils';

import { Badge } from '@/components/ui';

import { TriageControl } from './triage-control';
import { VitalsForm } from './vitals-form';

import type { VitalsScreenProps } from './vitals.types';

/*
  The nurse's screen for one appointment: who the visit is for and where it sits, then the two writes
  a nurse owns — the triage priority that orders the queue, and the vitals taken at check-in. Both
  belong to the appointment, not the encounter, so a nurse records them here before the doctor opens
  the consultation and reads them back on the encounter screen.
*/
export function VitalsScreen({ appointment, patientName, medicalRecordNo }: VitalsScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{patientName}</h1>
          <Badge variant="neutral">{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">Record no.</dt>
            <dd className="font-mono text-sm">{medicalRecordNo}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">Appointment</dt>
            <dd className="text-sm">
              {formatShortDate(appointment.date)} · {appointment.startTime}–{appointment.endTime}
            </dd>
          </div>
          {typeof appointment.tokenNo === 'number' && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">Token</dt>
              <dd className="text-sm">{appointment.tokenNo}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <h2 className="text-sm font-medium">Triage</h2>
        <TriageControl appointmentId={appointment.appointmentId} priority={appointment.triagePriority} />
      </section>

      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Vitals</h2>
          <p className="text-muted-foreground text-sm">Leave a reading blank if it was not taken.</p>
        </div>
        <VitalsForm appointmentId={appointment.appointmentId} vitals={appointment.vitals ?? null} />
      </section>
    </div>
  );
}
