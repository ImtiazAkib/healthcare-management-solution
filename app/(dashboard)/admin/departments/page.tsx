import type { Metadata } from 'next';

import { FILTER_ALL } from '@/constants/users.const';

import { requireAdminArea } from '@/lib/auth';
import { DepartmentFiltersSchema } from '@/lib/schemas';
import { DepartmentService } from '@/lib/services';

import { DepartmentsScreen } from '@/components/admin/departments';

import { loadDepartmentsSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const departmentService = new DepartmentService();

type AdminDepartmentsPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Departments',
  robots: { index: false, follow: false },
};

export default async function AdminDepartmentsPage({ searchParams }: AdminDepartmentsPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `DepartmentFiltersSchema` catches rather than throws on
    every field, so a hand-edited query string degrades to the unfiltered list instead of
    rendering an error page.
  */
  const filters = DepartmentFiltersSchema.parse(await loadDepartmentsSearchParams(searchParams));

  const [departments, headOptions] = await Promise.all([departmentService.list(filters), departmentService.listAssignableHeadDoctors()]);

  /*
    Id → name, built once here so the table row can show a department's head by name without a
    second query. A head who has since been deactivated is not in this set, so the row falls
    back to "—" — a display gap, not a lost link, since the id is still stored.
  */
  const headNames: Record<string, string> = {};

  for (const option of headOptions.result) {
    headNames[option.doctorId] = option.name;
  }

  const isFiltered = filters.status !== FILTER_ALL || filters.query !== '';

  return <DepartmentsScreen departments={departments.result} headOptions={headOptions.result} headNames={headNames} filtered={isFiltered} />;
}
