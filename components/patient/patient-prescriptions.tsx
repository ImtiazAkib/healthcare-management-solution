import { Pill } from 'lucide-react';

import { formatShortDate, isPrescriptionSuperseded, summarizePrescriptionItem } from '@/lib/utils';

import { PrescriptionStatusBadge } from '@/components/prescriptions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import { PatientPortalEmpty } from './patient-portal-empty';

import type { PortalPrescription, PatientPrescriptionsProps } from './patient.types';

/** The drugs column: the first item as a readable line, with a count of the rest so a long list stays short. */
function describeDrugs(prescription: PortalPrescription): string {
  const [firstItem, ...restItems] = prescription.items;

  if (!firstItem) {
    return '—';
  }

  const head = summarizePrescriptionItem(firstItem);

  return restItems.length > 0 ? `${head} +${restItems.length} more` : head;
}

/*
  The patient's prescriptions, newest first — read-only. Every script they have been issued is
  listed; a later one replacing an earlier marks the earlier "Replaced", so it is clear at a glance
  which instruction is the live one to fill against.
*/
export function PatientPrescriptions({ prescriptions }: PatientPrescriptionsProps) {
  if (prescriptions.length === 0) {
    return (
      <PatientPortalEmpty
        icon={Pill}
        title="No prescriptions yet"
        description="Prescriptions written for you during a consultation appear here, newest first."
      />
    );
  }

  return (
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="My prescriptions" className="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Drugs</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {prescriptions.map(prescription => (
            <TableRow key={prescription.prescriptionId}>
              <TableCell className="max-w-xs truncate">{describeDrugs(prescription)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatShortDate(prescription.issuedAt)}</TableCell>
              <TableCell className="font-medium">{prescription.doctorName}</TableCell>
              <TableCell>
                <PrescriptionStatusBadge superseded={isPrescriptionSuperseded(prescription)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
