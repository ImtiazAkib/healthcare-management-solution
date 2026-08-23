'use client';

import { formatShortDate, formatShortDateTime, isEncounterEditable } from '@/lib/utils';

import { LabOrdersPanel } from '@/components/lab';
import type { LabOrderRow } from '@/components/lab';
import { PrescriptionsPanel } from '@/components/prescriptions';
import { Badge } from '@/components/ui';

import { EncounterAddendumForm } from './encounter-addendum.form';
import { EncounterForm } from './encounter-form';
import { EncounterStatusBadge } from './encounter-status.badge';
import { EncounterVitalsPanel } from './encounter-vitals-panel';

import type { EncounterDetail, EncounterDto, Vitals } from './encounters.types';
import type { PrescriptionDto } from '@/types';

type EncounterScreenProps = {
  encounter: EncounterDetail;
  vitals: Vitals | null;
  patientName: string;
  prescriptions: PrescriptionDto[];
  labOrders: LabOrderRow[];
};

type DetailRowProps = {
  label: string;
  children: React.ReactNode;
};

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm wrap-break-word">{children}</dd>
    </div>
  );
}

function DiagnosisChips({ diagnoses }: { diagnoses: EncounterDto['diagnoses'] }) {
  if (diagnoses.length === 0) {
    return <span className="text-muted-foreground">None recorded</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {diagnoses.map((diagnosis, index) => (
        <Badge key={`${index}-${diagnosis.description}`} variant="outline">
          {diagnosis.description}
          {diagnosis.code ? <span className="text-muted-foreground ml-1 font-mono text-xs">{diagnosis.code}</span> : null}
        </Badge>
      ))}
    </div>
  );
}

/*
  The one client screen for an encounter. It shows who the visit is for, where in its life it sits,
  and the vitals taken at check-in — read-only, a nurse's record, not the doctor's to edit here.

  What sits under that is the encounter's status: while it is **open** the consultation is editable
  and the form owns the writes; once **completed** it is a record, shown read-only, with the addenda
  that are the only correction a closed encounter takes.
*/
export function EncounterScreen({ encounter, vitals, patientName, prescriptions, labOrders }: EncounterScreenProps) {
  const editable = isEncounterEditable(encounter.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{patientName}</h1>
            <EncounterStatusBadge status={encounter.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            Encounter opened {formatShortDate(encounter.createdAt)}
            {encounter.completedAt ? ` · completed ${formatShortDate(encounter.completedAt)}` : ''}
          </p>
        </div>
      </div>

      <EncounterVitalsPanel vitals={vitals} />

      {editable ? (
        <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Consultation</h2>
          <EncounterForm encounter={encounter} />
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <h2 className="text-sm font-medium">Consultation</h2>
            <dl className="flex flex-col gap-4">
              <DetailRow label="Chief complaint">{encounter.chiefComplaint ?? '—'}</DetailRow>
              <DetailRow label="Examination">
                <span className="whitespace-pre-wrap">{encounter.examination ?? '—'}</span>
              </DetailRow>
              <DetailRow label="Diagnoses">
                <DiagnosisChips diagnoses={encounter.diagnoses} />
              </DetailRow>
              <DetailRow label="Treatment notes">
                <span className="whitespace-pre-wrap">{encounter.treatmentNotes ?? '—'}</span>
              </DetailRow>
              <DetailRow label="Follow-up date">{encounter.followUpDate ? formatShortDate(encounter.followUpDate) : '—'}</DetailRow>
            </dl>
          </section>

          <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <h2 className="text-sm font-medium">Addenda</h2>
            {encounter.addenda.length === 0 ? (
              <p className="text-muted-foreground text-sm">No addenda added.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {encounter.addenda.map((addendum, index) => (
                  <li key={`${index}-${addendum.addedAt}`} className="border-border flex flex-col gap-1 rounded-md border p-3">
                    <p className="text-sm whitespace-pre-wrap">{addendum.note}</p>
                    <p className="text-muted-foreground text-xs">
                      Added {formatShortDateTime(addendum.addedAt)} by {addendum.addedByName}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-border border-t pt-4">
              <EncounterAddendumForm encounterId={encounter.encounterId} />
            </div>
          </section>
        </div>
      )}

      <PrescriptionsPanel encounterId={encounter.encounterId} prescriptions={prescriptions} canIssue={editable} />

      <LabOrdersPanel encounterId={encounter.encounterId} orders={labOrders} canOrder={editable} />
    </div>
  );
}
