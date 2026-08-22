'use client';

import { useState, useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { Input, Label, Spinner } from '@/components/ui';

const SEARCH_THROTTLE_MS = 400;

/*
  One filter: a search box, in the URL via nuqs so a search can be shared and survives a reload.
  `shallow: false` is what sends the change to the server component, which re-runs the query. The
  box keeps its own copy so typing stays instant, and the URL follows on a throttle.
*/
export function PatientsFilters() {
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates(
    {
      query: parseAsString.withDefault(''),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  const [search, setSearch] = useState(filters.query);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.target.value);

    void setFilters({ query: event.target.value || null }, { throttleMs: SEARCH_THROTTLE_MS });
  };

  return (
    <div aria-busy={isPending} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="patients-search">Search</Label>
        {isPending && <Spinner className="text-muted-foreground size-3.5" />}
      </div>

      <Input
        id="patients-search"
        type="search"
        value={search}
        placeholder="Record number, name or phone"
        className="sm:max-w-md"
        onChange={handleSearchChange}
      />
    </div>
  );
}
