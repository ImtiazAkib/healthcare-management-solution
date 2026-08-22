'use client';

import { useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { AVAILABILITY_STATUS_FILTERS, DAYS_OF_WEEK, DAY_OF_WEEK_LABELS } from '@/constants/schedule.const';
import { FILTER_ALL } from '@/constants/users.const';

import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@/components/ui';

import type { DoctorOption } from './availability.types';

const STATUS_ITEMS: Record<string, string> = {
  [AVAILABILITY_STATUS_FILTERS.ALL]: 'All statuses',
  [AVAILABILITY_STATUS_FILTERS.ACTIVE]: 'Active',
  [AVAILABILITY_STATUS_FILTERS.INACTIVE]: 'Deactivated',
};

type AvailabilityFiltersProps = {
  doctorOptions: DoctorOption[];
};

/*
  Filters live in the URL rather than component state, so a filtered week can be bookmarked,
  shared and survives a refresh. `shallow: false` is what makes that work: the change reaches the
  server component, which re-runs the query. `startTransition` is handed to nuqs so `isPending`
  follows that round trip — the spinner and `aria-busy` are the sign the week is refetching.
*/
export function AvailabilityFilters({ doctorOptions }: AvailabilityFiltersProps) {
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates(
    {
      doctorId: parseAsString.withDefault(FILTER_ALL),
      dayOfWeek: parseAsString.withDefault(FILTER_ALL),
      status: parseAsString.withDefault(FILTER_ALL),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  const doctorItems: Record<string, string> = { [FILTER_ALL]: 'All doctors' };

  for (const option of doctorOptions) {
    doctorItems[option.doctorId] = option.name;
  }

  const dayItems: Record<string, string> = { [FILTER_ALL]: 'All days' };

  for (const day of DAYS_OF_WEEK) {
    dayItems[day] = DAY_OF_WEEK_LABELS[day];
  }

  const isFiltered = filters.doctorId !== FILTER_ALL || filters.dayOfWeek !== FILTER_ALL || filters.status !== FILTER_ALL;

  const handleDoctorChange = (value: unknown): void => {
    void setFilters({ doctorId: String(value) });
  };

  const handleDayChange = (value: unknown): void => {
    void setFilters({ dayOfWeek: String(value) });
  };

  const handleStatusChange = (value: unknown): void => {
    void setFilters({ status: String(value) });
  };

  const handleClearClick = (): void => {
    void setFilters({ doctorId: null, dayOfWeek: null, status: null });
  };

  return (
    <div aria-busy={isPending} className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="availability-doctor">Doctor</Label>
          {isPending && <Spinner className="text-muted-foreground size-3.5" />}
        </div>
        <Select items={doctorItems} value={filters.doctorId} onValueChange={handleDoctorChange}>
          <SelectTrigger id="availability-doctor" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(doctorItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="availability-day">Day</Label>
        <Select items={dayItems} value={filters.dayOfWeek} onValueChange={handleDayChange}>
          <SelectTrigger id="availability-day" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(dayItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="availability-status">Status</Label>
        <Select items={STATUS_ITEMS} value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger id="availability-status" className="w-full sm:w-44">
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
        <Button type="button" variant="outline" className="sm:col-span-4 sm:justify-self-start" onClick={handleClearClick}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
