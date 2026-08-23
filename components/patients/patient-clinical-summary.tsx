import { PatientDetailDto } from '@/types';

import { GENDER_LABELS } from '@/constants/users.const';

import { calculateAge, formatShortDate } from '@/lib/utils';

import { EncounterTimeline } from '@/components/encounters';
import type { TimelineEntry } from '@/components/encounters';
import { Badge } from '@/components/ui';

type PatientClinicalSummaryProps = {
  patient: PatientDetailDto;
  timeline: TimelineEntry[];
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

function Chips({ entries }: { entries: string[] }) {
  if (entries.length === 0) {
    return <span className="text-muted-foreground">None recorded</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry, index) => (
        <Badge key={`${index}-${entry}`} variant="outline">
          {entry}
        </Badge>
      ))}
    </div>
  );
}

/*
  The doctor's read of a patient's record. It shows the same demographics, clinical record and
  emergency contact as the registry's summary, but with **no edit control** — a doctor reads the
  record; reception owns the corrections. Under it sits the clinical timeline, the reason a doctor
  opens this page: the patient's encounters, each a link into the visit.
*/
export function PatientClinicalSummary({ patient, timeline }: PatientClinicalSummaryProps) {
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const genderLabel = patient.gender ? GENDER_LABELS[patient.gender] : 'Not recorded';

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{patient.name}</h1>
          <Badge variant="neutral" className="font-mono">
            {patient.medicalRecordNo}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {age !== null ? `${age} years old` : 'Age not recorded'} · {genderLabel}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Demographics</h2>
          <dl className="grid grid-cols-2 gap-4">
            <DetailRow label="Email">{patient.email}</DetailRow>
            <DetailRow label="Phone">{patient.phone ?? '—'}</DetailRow>
            <DetailRow label="Date of birth">{patient.dateOfBirth ? formatShortDate(patient.dateOfBirth) : '—'}</DetailRow>
            <DetailRow label="Gender">{genderLabel}</DetailRow>
            <div className="col-span-2">
              <DetailRow label="Address">{patient.address ?? '—'}</DetailRow>
            </div>
          </dl>
        </section>

        <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Clinical record</h2>
          <dl className="flex flex-col gap-4">
            <DetailRow label="Blood group">{patient.bloodGroup ?? 'Unknown'}</DetailRow>
            <DetailRow label="Allergies">
              <Chips entries={patient.allergies} />
            </DetailRow>
            <DetailRow label="Chronic conditions">
              <Chips entries={patient.chronicConditions} />
            </DetailRow>
          </dl>
        </section>

        <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Emergency contact</h2>
          {patient.emergencyContact ? (
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow label="Name">{patient.emergencyContact.name}</DetailRow>
              <DetailRow label="Relationship">{patient.emergencyContact.relation}</DetailRow>
              <DetailRow label="Phone">{patient.emergencyContact.phone}</DetailRow>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">None recorded.</p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Clinical timeline</h2>
        <EncounterTimeline entries={timeline} />
      </section>
    </div>
  );
}
