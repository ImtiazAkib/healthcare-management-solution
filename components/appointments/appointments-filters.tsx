'use client';

import { useState, useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_LABELS } from '@/constants/appointment.const';
import { FILTER_ALL } from '@/constants/users.const';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@/components/ui';

import type { DoctorOption } from './appointments.types';

const STATUS_ITEMS: Record<string, string> = {
  [FILTER_ALL]: 'All statuses',
  ...Object.fromEntries(Object.values(APPOINTMENT_STATUSES).map(status => [status, APPOINTMENT_STATUS_LABELS[status]])),
};

type AppointmentsFiltersProps = {
  doctorOptions: DoctorOption[];
};

/*
  Doctor, day and status, kept in the URL rather than component state so a filtered view can be
  bookmarked, shared and survives a refresh. `shallow: false` is what makes that work: the change
  reaches the server component, which re-runs the query. `startTransition` is handed to nuqs so
  `isPending` follows that round trip — the spinner and `aria-busy` are the sign the list is
  refetching. The date keeps its own copy so the native picker stays instant, and the URL follows.
*/
export function AppointmentsFilters({ doctorOptions }: AppointmentsFiltersProps) {
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates(
    {
      doctorId: parseAsString.withDefault(FILTER_ALL),
      date: parseAsString.withDefault(''),
      status: parseAsString.withDefault(FILTER_ALL),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  const [date, setDate] = useState(filters.date);

  const doctorItems: Record<string, string> = { [FILTER_ALL]: 'All doctors' };

  for (const option of doctorOptions) {
    doctorItems[option.doctorId] = option.name;
  }

  const isFiltered = filters.doctorId !== FILTER_ALL || filters.date !== '' || filters.status !== FILTER_ALL;

  const handleDoctorChange = (value: unknown): void => {
    void setFilters({ doctorId: String(value) });
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setDate(event.target.value);

    void setFilters({ date: event.target.value || null });
  };

  const handleStatusChange = (value: unknown): void => {
    void setFilters({ status: String(value) });
  };

  const handleClearClick = (): void => {
    setDate('');

    void setFilters({ doctorId: null, date: null, status: null });
  };

  return (
    <div aria-busy={isPending} className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="appointments-doctor">Doctor</Label>
          {isPending && <Spinner className="text-muted-foreground size-3.5" />}
        </div>
        <Select items={doctorItems} value={filters.doctorId} onValueChange={handleDoctorChange}>
          <SelectTrigger id="appointments-doctor" className="w-full sm:w-56">
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
        <Label htmlFor="appointments-date">Day</Label>
        <Input id="appointments-date" type="date" value={date} className="w-full sm:w-44" onChange={handleDateChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="appointments-status">Status</Label>
        <Select items={STATUS_ITEMS} value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger id="appointments-status" className="w-full sm:w-44">
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
