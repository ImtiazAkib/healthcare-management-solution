import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants/roles.const';
import { FILTER_ALL } from '@/constants/users.const';

import { requireAdminArea } from '@/lib/auth';
import { UserFiltersSchema } from '@/lib/schemas';
import { UserService } from '@/lib/services';

import { UsersScreen } from '@/components/admin/users';

import { loadUsersSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const userService = new UserService();

type AdminUsersPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Staff accounts',
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  const sessionUser = await requireAdminArea();

  /*
    The URL is parsed, then validated. `UserFiltersSchema` catches rather than throws on every
    field, so a hand-edited query string degrades to the unfiltered list instead of rendering
    an error page.
  */
  const filters = UserFiltersSchema.parse(await loadUsersSearchParams(searchParams));

  const result = await userService.list(filters);

  const isFiltered = filters.role !== FILTER_ALL || filters.status !== FILTER_ALL || filters.query !== '';

  return (
    <UsersScreen
      users={result.result}
      viewer={{ userId: sessionUser.userId, isSuperAdmin: sessionUser.role === USER_ROLES.SUPER_ADMIN }}
      filtered={isFiltered}
    />
  );
}
