import type { Metadata } from 'next';

import Link from 'next/link';

import { Stethoscope, Users } from 'lucide-react';

import { CODES, USER_ROLES } from '@/constants';
import { PatientSummaryDto } from '@/types';

import { GENDER_LABELS } from '@/constants/users.const';

import { requireRole } from '@/lib/auth';
import { MedicalRecordService } from '@/lib/services';
import { calculateAge } from '@/lib/utils';

import { Badge, EmptyState, Input, Label, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import type { SearchParams } from 'nuqs/server';

const medicalRecordService = new MedicalRecordService();

type DoctorPatientsPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'My patients',
  robots: { index: false, follow: false },
};

/** Read the search box off the URL as a plain trimmed string, whatever nuqs left in it. */
function readQuery(value: SearchParams[string]): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim();
  }

  return '';
}

export default async function DoctorPatientsPage({ searchParams }: DoctorPatientsPageProps) {
  // The doctor's own record is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const query = readQuery((await searchParams).query);

  const patients = await medicalRecordService.listMyPatients(sessionUser, query);

  /*
    A doctor account with no professional record yet is a normal early state, not an error — the
    record is set up by an administrator in a separate flow — so it renders an empty state. A real
    read failure returns the same empty list, so the two are told apart by the code: only a genuine
    "no doctor profile" shows the empty state; anything else is thrown to the error boundary rather
    than telling a doctor with patients that they have none.
  */
  if (!patients.success) {
    if (patients.errors[0]?.code !== CODES.VALIDATION.ENCOUNTERS.NO_DOCTOR_PROFILE.CODE) {
      throw new Error('Could not load your patients. Please try again.');
    }

    return (
      <EmptyState
        icon={Stethoscope}
        title="No doctor profile yet"
        description="An administrator sets up your professional record. Once it exists, the patients you have seen appear here."
      />
    );
  }

  const rows: PatientSummaryDto[] = patients.result;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My patients" description="The patients you have a record with. Find one by name or record number to open their timeline." />

      <form method="get" className="flex flex-col gap-2">
        <Label htmlFor="doctor-patients-search">Search</Label>
        <Input
          id="doctor-patients-search"
          type="search"
          name="query"
          defaultValue={query}
          placeholder="Name or record number"
          className="sm:max-w-md"
        />
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? 'No patients match your search' : 'No patients yet'}
          description={
            query
              ? 'Try another name or record number, or clear the search.'
              : 'Patients you see in a consultation, or who are booked with you, appear here.'
          }
        />
      ) : (
        <div className="border-border w-full overflow-x-auto rounded-lg border">
          <Table aria-label="My patients" className="min-w-2xl">
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
              {rows.map(patient => (
                <TableRow key={patient.patientId}>
                  <TableCell>
                    <Badge variant="neutral" className="font-mono">
                      {patient.medicalRecordNo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/doctor/patients/${patient.patientId}`} className="font-medium hover:underline">
                      {patient.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : '—'}</TableCell>
                  <TableCell>{patient.gender ? GENDER_LABELS[patient.gender] : '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{patient.phone ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
