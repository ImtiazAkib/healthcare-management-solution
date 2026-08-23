'use client';

import { useState, useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { AUDIT_OUTCOME_FILTERS } from '@/constants';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@/components/ui';

const SEARCH_THROTTLE_MS = 400;

const OUTCOME_ITEMS: Record<string, string> = {
  [AUDIT_OUTCOME_FILTERS.ALL]: 'All outcomes',
  [AUDIT_OUTCOME_FILTERS.GRANTED]: 'Granted',
  [AUDIT_OUTCOME_FILTERS.REFUSED]: 'Refused',
};

/*
  Filters live in the URL rather than component state, so a filtered view can be bookmarked, shared
  and survives a refresh. `shallow: false` is what makes that work: the change reaches the server
  component, which re-runs the query.
*/
export function AuditFilters() {
  /*
    `startTransition` handed to nuqs so `isPending` follows the `shallow: false` round trip that
    re-runs the server query — without it a filter change gives no sign the trail is refetching. The
    spinner by the search field and `aria-busy` on the group are that sign.
  */
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates(
    {
      outcome: parseAsString.withDefault(AUDIT_OUTCOME_FILTERS.ALL),
      query: parseAsString.withDefault(''),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  /*
    The text box keeps its own copy so typing stays instant. The URL — and with it the server round
    trip — follows on a throttle rather than on every keystroke.
  */
  const [search, setSearch] = useState(filters.query);

  const isFiltered = filters.outcome !== AUDIT_OUTCOME_FILTERS.ALL || filters.query !== '';

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.target.value);

    void setFilters({ query: event.target.value || null }, { throttleMs: SEARCH_THROTTLE_MS });
  };

  const handleOutcomeChange = (value: unknown): void => {
    void setFilters({ outcome: String(value) });
  };

  const handleClearClick = (): void => {
    setSearch('');

    void setFilters({ outcome: null, query: null });
  };

  return (
    <div aria-busy={isPending} className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="audit-search">Search</Label>
          {isPending && <Spinner className="text-muted-foreground size-3.5" />}
        </div>
        <Input id="audit-search" type="search" value={search} placeholder="Actor name" onChange={handleSearchChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="audit-outcome">Outcome</Label>
        <Select items={OUTCOME_ITEMS} value={filters.outcome} onValueChange={handleOutcomeChange}>
          <SelectTrigger id="audit-outcome" className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OUTCOME_ITEMS).map(([value, label]) => (
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
