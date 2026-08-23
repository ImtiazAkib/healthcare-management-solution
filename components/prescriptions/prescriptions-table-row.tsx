import Link from 'next/link';

import { formatShortDate, isPrescriptionSuperseded } from '@/lib/utils';

import { Badge, TableCell, TableRow } from '@/components/ui';

import { PrescriptionStatusBadge } from './prescription-status.badge';

import type { PrescriptionRow } from './prescriptions.types';

type PrescriptionsTableRowProps = {
  prescription: PrescriptionRow;
};

/** The drugs column: the first drug named, with a count of the rest so a long list stays one line. */
function describeDrugs(prescription: PrescriptionRow): string {
  const [firstItem, ...restItems] = prescription.items;

  if (!firstItem) {
    return '—';
  }

  return restItems.length > 0 ? `${firstItem.drug} +${restItems.length}` : firstItem.drug;
}

export function PrescriptionsTableRow({ prescription }: PrescriptionsTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Badge variant="neutral" className="font-mono">
          {prescription.medicalRecordNo}
        </Badge>
      </TableCell>

      <TableCell>
        <Link href={`/doctor/prescriptions/${prescription.prescriptionId}`} className="font-medium hover:underline">
          {prescription.patientName}
        </Link>
      </TableCell>

      <TableCell className="max-w-xs truncate">{describeDrugs(prescription)}</TableCell>

      <TableCell className="whitespace-nowrap">{formatShortDate(prescription.issuedAt)}</TableCell>

      <TableCell>
        <PrescriptionStatusBadge superseded={isPrescriptionSuperseded(prescription)} />
      </TableCell>
    </TableRow>
  );
}
