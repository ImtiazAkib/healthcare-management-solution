import Link from 'next/link';

import { PatientSummaryDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';
import { GENDER_LABELS } from '@/constants/users.const';

import { calculateAge } from '@/lib/utils';

import { Badge, TableCell, TableRow } from '@/components/ui';

type PatientsTableRowProps = {
  patient: PatientSummaryDto;
};

export function PatientsTableRow({ patient }: PatientsTableRowProps) {
  const age = patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : '—';
  const gender = patient.gender ? GENDER_LABELS[patient.gender] : '—';

  return (
    <TableRow>
      <TableCell>
        <Badge variant="neutral" className="font-mono">
          {patient.medicalRecordNo}
        </Badge>
      </TableCell>

      <TableCell>
        <Link href={`${ROUTES.ADMIN_PATIENTS.HREF}/${patient.patientId}`} className="font-medium hover:underline">
          {patient.name}
        </Link>
      </TableCell>

      <TableCell className="whitespace-nowrap">{age}</TableCell>

      <TableCell>{gender}</TableCell>

      <TableCell className="text-muted-foreground whitespace-nowrap">{patient.phone ?? '—'}</TableCell>
    </TableRow>
  );
}
