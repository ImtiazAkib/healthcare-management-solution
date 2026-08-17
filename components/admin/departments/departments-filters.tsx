'use client';

import { useState, useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { DEPARTMENT_STATUS_FILTERS } from '@/constants/directory.const';
import { FILTER_ALL } from '@/constants/users.const';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@/components/ui';

const SEARCH_THROTTLE_MS = 400;

const STATUS_ITEMS: Record<string, string> = {
  [DEPARTMENT_STATUS_FILTERS.ALL]: 'All statuses',
  [DEPARTMENT_STATUS_FILTERS.ACTIVE]: 'Active',
  [DEPARTMENT_STATUS_FILTERS.INACTIVE]: 'Deactivated',
};

/*
  Filters live in the URL rather than component state, so a filtered view can be bookmarked,
  shared and survives a refresh. `shallow: false` is what makes that work: the change reaches
  the server component, which re-runs the query.
*/
export function DepartmentsFilters() {
  /*
    `startTransition` handed to nuqs so `isPending` follows the `shallow: false` round trip
    that re-runs the server query — without it a filter change gives no sign the list is
    refetching. The spinner by the search field and `aria-busy` on the group are that sign.
  */
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsString.withDefault(FILTER_ALL),
      query: parseAsString.withDefault(''),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  /*
    The text box keeps its own copy so typing stays instant. The URL — and with it the server
    round trip — follows on a throttle rather than on every keystroke.
  */
  const [search, setSearch] = useState(filters.query);

  const isFiltered = filters.status !== FILTER_ALL || filters.query !== '';

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.target.value);

    void setFilters({ query: event.target.value || null }, { throttleMs: SEARCH_THROTTLE_MS });
  };

  const handleStatusChange = (value: unknown): void => {
    void setFilters({ status: String(value) });
  };

  const handleClearClick = (): void => {
    setSearch('');

    void setFilters({ status: null, query: null });
  };

  return (
    <div aria-busy={isPending} className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="departments-search">Search</Label>
          {isPending && <Spinner className="text-muted-foreground size-3.5" />}
        </div>
        <Input id="departments-search" type="search" value={search} placeholder="Name or code" onChange={handleSearchChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="departments-status">Status</Label>
        <Select items={STATUS_ITEMS} value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger id="departments-status" className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFiltered && (
        <Button type="button" variant="outline" className="sm:col-span-2 sm:justify-self-start" onClick={handleClearClick}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
