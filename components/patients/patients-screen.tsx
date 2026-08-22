import Link from 'next/link';

import { UserPlus } from 'lucide-react';

import { PatientSummaryDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';

import { Button, PageHeader } from '@/components/ui';

import { PatientsEmpty } from './patients-empty';
import { PatientsFilters } from './patients-filters';
import { PatientsTable } from './patients-table';

type PatientsScreenProps = {
  patients: PatientSummaryDto[];
  /** Total records matching the search, which can exceed the page — the table shows the first page. */
  total: number;
  /** True when the search box is set, so the empty state can tell "none yet" from "none match". */
  filtered: boolean;
};

/*
  The registry list. Unlike the staff screen there are no row mutations here — a row links to the
  patient's record, where editing happens — so this composes the header, the search and the table
  without any client state of its own. The search bar and the table each own what they need.
*/
export function PatientsScreen({ patients, total, filtered }: PatientsScreenProps) {
  // The page is capped; when more match than are shown, say so rather than hiding the rest silently.
  const isTruncated = total > patients.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="Register patients at the counter and find them again by record number, name or phone."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_PATIENTS_NEW.HREF} />}>
            <UserPlus className="size-4" />
            Register a patient
          </Button>
        }
      />

      <PatientsFilters />

      {patients.length === 0 ? (
        <PatientsEmpty filtered={filtered} />
      ) : (
        <div className="flex flex-col gap-2">
          <PatientsTable patients={patients} />
          {isTruncated && (
            <p role="status" className="text-muted-foreground text-sm">
              Showing {patients.length} of {total} matches. Narrow your search to see the rest.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
