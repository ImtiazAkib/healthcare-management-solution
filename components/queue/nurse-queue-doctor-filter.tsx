'use client';

import { useTransition } from 'react';

import { parseAsString, useQueryState } from 'nuqs';

import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@/components/ui';

import type { NurseQueueDoctorFilterProps } from './queue.types';

/*
  The nurse picks whose queue they are watching, and the choice lives in the URL — a bookmarked
  `?doctorId` reopens on the same doctor and survives a refresh. `shallow: false` is what sends the
  change to the server component so it re-reads that doctor's queue; `startTransition` is handed to
  nuqs so the spinner follows the round trip. The value is server-decided (the validated id, or the
  first doctor when none was chosen), so this reflects it rather than holding its own.
*/
export function NurseQueueDoctorFilter({ doctorOptions, value }: NurseQueueDoctorFilterProps) {
  const [isPending, startTransition] = useTransition();

  const [, setDoctorId] = useQueryState('doctorId', parseAsString.withOptions({ shallow: false, startTransition }));

  const doctorItems: Record<string, string> = {};

  for (const option of doctorOptions) {
    doctorItems[option.doctorId] = option.name;
  }

  const handleDoctorChange = (next: unknown): void => {
    void setDoctorId(String(next));
  };

  return (
    <div aria-busy={isPending} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="nurse-queue-doctor">Doctor</Label>
        {isPending && <Spinner className="text-muted-foreground size-3.5" />}
      </div>
      <Select items={doctorItems} value={value} onValueChange={handleDoctorChange}>
        <SelectTrigger id="nurse-queue-doctor" className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(doctorItems).map(([doctorId, name]) => (
            <SelectItem key={doctorId} value={doctorId}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
