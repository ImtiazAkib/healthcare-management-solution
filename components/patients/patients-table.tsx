import { PatientSummaryDto } from '@/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { PatientsTableRow } from './patients-table-row';

type PatientsTableProps = {
  patients: PatientSummaryDto[];
};

export function PatientsTable({ patients }: PatientsTableProps) {
  return (
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Patients" className="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Record no.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {patients.map(patient => (
            <PatientsTableRow key={patient.patientId} patient={patient} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
