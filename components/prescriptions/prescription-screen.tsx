import Link from 'next/link';

import { Printer } from 'lucide-react';

import { PRESCRIPTION_FREQUENCY_LABELS } from '@/constants';

import { GENDER_LABELS } from '@/constants/users.const';

import { calculateAge, formatLongDate, isPrescriptionSuperseded } from '@/lib/utils';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import { PrescriptionStatusBadge } from './prescription-status.badge';

import type { PrescriptionDetail } from './prescriptions.types';

type PrescriptionScreenProps = {
  prescription: PrescriptionDetail;
};

/** A blank cell reads better as a dash than as nothing — used for every optional item field. */
function orDash(value: string | null | undefined): string {
  return value ? value : '—';
}

/*
  A prescription, read-only, as its own page. It is immutable once issued, so there is nothing to
  edit here — the only "change" is a replacement made from the encounter screen. What this offers
  instead is the full record and a way to print it: the identity of patient and prescriber, the
  drugs in a table, the advice, and — when it has been replaced — a plain note that a newer one
  stands in its place.
*/
export function PrescriptionScreen({ prescription }: PrescriptionScreenProps) {
  const superseded = isPrescriptionSuperseded(prescription);

  const age = prescription.patientDateOfBirth ? calculateAge(prescription.patientDateOfBirth) : null;
  const gender = prescription.patientGender ? GENDER_LABELS[prescription.patientGender] : null;
  const patientMeta = [age !== null ? `${age} years old` : null, gender].filter(Boolean).join(' · ');

  const prescriberMeta = [prescription.doctorDesignation, prescription.doctorSpecialization].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{prescription.patientName}</h1>
            <Badge variant="neutral" className="font-mono">
              {prescription.medicalRecordNo}
            </Badge>
            <PrescriptionStatusBadge superseded={superseded} />
          </div>
          {patientMeta && <p className="text-muted-foreground text-sm">{patientMeta}</p>}
        </div>

        <Button variant="outline" render={<Link href={`/doctor/prescriptions/${prescription.prescriptionId}/print`} />}>
          <Printer className="size-4" />
          Print
        </Button>
      </section>

      {superseded && (
        <p role="status" className="border-border bg-muted/50 text-muted-foreground flex flex-wrap gap-x-1.5 rounded-md border px-3 py-2 text-sm">
          This prescription was replaced by a newer one.
          {prescription.supersededById && (
            <Link href={`/doctor/prescriptions/${prescription.supersededById}`} className="text-foreground font-medium hover:underline">
              View the current prescription
            </Link>
          )}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border flex flex-col gap-2 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Prescriber</h2>
          <p className="text-sm font-medium">{prescription.doctorName}</p>
          {prescriberMeta && <p className="text-muted-foreground text-sm">{prescriberMeta}</p>}
          <p className="text-muted-foreground text-sm">Reg. No: {prescription.doctorRegistrationNo}</p>
        </section>

        <section className="border-border flex flex-col gap-2 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Issued</h2>
          <p className="text-sm">{formatLongDate(prescription.issuedAt)}</p>
        </section>
      </div>

      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <h2 className="text-sm font-medium">Drugs</h2>

        <div className="w-full overflow-x-auto">
          <Table aria-label="Prescribed drugs" className="min-w-3xl">
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Dose</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Instructions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {prescription.items.map((item, index) => (
                <TableRow key={`${index}-${item.drug}`}>
                  <TableCell className="font-medium">{item.drug}</TableCell>
                  <TableCell>{orDash(item.strength)}</TableCell>
                  <TableCell>{orDash(item.dose)}</TableCell>
                  <TableCell className="whitespace-nowrap">{PRESCRIPTION_FREQUENCY_LABELS[item.frequency]}</TableCell>
                  <TableCell>{orDash(item.duration)}</TableCell>
                  <TableCell>{orDash(item.instructions)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {prescription.advice && (
        <section className="border-border flex flex-col gap-2 rounded-lg border p-5">
          <h2 className="text-sm font-medium">Advice</h2>
          <p className="text-sm whitespace-pre-line">{prescription.advice}</p>
        </section>
      )}
    </div>
  );
}
