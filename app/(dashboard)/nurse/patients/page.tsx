import type { Metadata } from 'next';

import { Users } from 'lucide-react';

import { GENDER_LABELS, USER_ROLES } from '@/constants';
import { PatientSummaryDto } from '@/types';

import { requireRole } from '@/lib/auth';
import { PatientFiltersSchema } from '@/lib/schemas';
import { PatientService } from '@/lib/services';
import { calculateAge } from '@/lib/utils';

import { Badge, EmptyState, Input, Label, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

import type { SearchParams } from 'nuqs/server';

const patientService = new PatientService();

type NursePatientsPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Patients',
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

export default async function NursePatientsPage({ searchParams }: NursePatientsPageProps) {
  // A doctor, lab, patient or administrator who reaches this URL is sent to /unauthorized, not sign-in.
  await requireRole(USER_ROLES.NURSE);

  const query = readQuery((await searchParams).query);

  // The schema catches a bad query rather than throwing, so a hand-edited URL degrades to the
  // unfiltered list rather than an error.
  const filters = PatientFiltersSchema.parse({ query });

  const result = await patientService.list(filters);

  // A failed read returns an empty list too — throw rather than tell a nurse the registry is empty
  // when the database is merely unreachable.
  if (!result.success) {
    throw new Error('Could not load patients. Please try again.');
  }

  const rows: PatientSummaryDto[] = result.result;
  const total = result.resultInfo?.totalCount ?? rows.length;
  const isTruncated = total > rows.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Patients" description="Find a patient by name, record number or phone. Vitals are recorded from the queue." />

      <form method="get" className="flex flex-col gap-2">
        <Label htmlFor="nurse-patients-search">Search</Label>
        <Input
          id="nurse-patients-search"
          type="search"
          name="query"
          defaultValue={filters.query}
          placeholder="Name, record number or phone"
          className="sm:max-w-md"
        />
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filters.query ? 'No patients match your search' : 'No patients yet'}
          description={
            filters.query ? 'Try another name, record number or phone, or clear the search.' : 'Patients registered at the counter appear here.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
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
                {rows.map(patient => (
                  <TableRow key={patient.patientId}>
                    <TableCell>
                      <Badge variant="neutral" className="font-mono">
                        {patient.medicalRecordNo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : '—'}</TableCell>
                    <TableCell>{patient.gender ? GENDER_LABELS[patient.gender] : '—'}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{patient.phone ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {isTruncated && (
            <p role="status" className="text-muted-foreground text-sm">
              Showing {rows.length} of {total} matches. Narrow your search to see the rest.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
