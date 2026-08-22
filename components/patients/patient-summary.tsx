'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { PatientDetailDto } from '@/types';

import { GENDER_LABELS } from '@/constants/users.const';

import { calculateAge, formatShortDate } from '@/lib/utils';

import { Badge, Button } from '@/components/ui';

import { PatientEditDialog } from './patient-edit.dialog';

type PatientSummaryProps = {
  patient: PatientDetailDto;
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
  The patient's record, and the one place it is edited. The demographics and the record number
  are shown but fixed; the clinical record opens in a dialog. The clinical-timeline card is
  deliberately an empty placeholder — this page is the spine that steps 10–13 hang encounters,
  prescriptions and results off, and it ships now with the shape and none of the content.
*/
export function PatientSummary({ patient }: PatientSummaryProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const handleUpdated = (): void => {
    setEditing(false);
    toast.success('Clinical record updated.');
    router.refresh();
  };

  const handleEditOpenChange = (open: boolean): void => {
    if (!open) {
      setEditing(false);
    }
  };

  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const genderLabel = patient.gender ? GENDER_LABELS[patient.gender] : 'Not recorded';

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
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

        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
          Edit clinical record
        </Button>
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

        <section className="border-border flex flex-col gap-3 rounded-lg border border-dashed p-5">
          <h2 className="text-sm font-medium">Clinical timeline</h2>
          <p className="text-muted-foreground text-sm">Encounters, prescriptions and diagnostic results will appear here as they are recorded.</p>
        </section>
      </div>

      {editing && <PatientEditDialog key={patient.patientId} patient={patient} onUpdated={handleUpdated} onOpenChange={handleEditOpenChange} />}
    </div>
  );
}
