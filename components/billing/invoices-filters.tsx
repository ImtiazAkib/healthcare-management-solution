'use client';

import { useState, useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { INVOICE_STATUS_FILTERS } from '@/constants';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@/components/ui';

const SEARCH_THROTTLE_MS = 400;

const STATUS_ITEMS: Record<string, string> = {
  [INVOICE_STATUS_FILTERS.ALL]: 'All statuses',
  [INVOICE_STATUS_FILTERS.DRAFT]: 'Draft',
  [INVOICE_STATUS_FILTERS.UNPAID]: 'Unpaid',
  [INVOICE_STATUS_FILTERS.PARTIAL]: 'Part paid',
  [INVOICE_STATUS_FILTERS.PAID]: 'Paid',
  [INVOICE_STATUS_FILTERS.VOID]: 'Void',
};

/*
  The invoices list's filters live in the URL, same as the users and services screens — a filtered
  view can then be bookmarked, shared, and survives a refresh. `shallow: false` is what carries a change to the
  server component so it re-runs the query; the spinner and `aria-busy` are the sign that round trip
  is in flight. The search box searches the patient's name and medical record number.
*/
export function InvoicesFilters() {
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsString.withDefault(INVOICE_STATUS_FILTERS.ALL),
      query: parseAsString.withDefault(''),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  // The text box keeps its own copy so typing stays instant; the URL follows on a throttle.
  const [search, setSearch] = useState(filters.query);

  const isFiltered = filters.status !== INVOICE_STATUS_FILTERS.ALL || filters.query !== '';

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
          <Label htmlFor="invoices-search">Search</Label>
          {isPending && <Spinner className="text-muted-foreground size-3.5" />}
        </div>
        <Input id="invoices-search" type="search" value={search} placeholder="Patient name or record number" onChange={handleSearchChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="invoices-status">Status</Label>
        <Select items={STATUS_ITEMS} value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger id="invoices-status" className="w-full sm:w-52">
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
