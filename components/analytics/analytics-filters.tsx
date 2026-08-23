'use client';

import { useTransition } from 'react';

import { parseAsString, useQueryStates } from 'nuqs';

import { Button, Input, Label, Spinner } from '@/components/ui';

/*
  The reporting window as URL state, so a window can be bookmarked, shared, and survives a refresh.
  `shallow: false` is what carries a change back to the server component, which re-runs the aggregation
  for the new dates; the transition drives the spinner so the round trip is not silent.

  Two native date inputs, deliberately: the window is a pair of `YYYY-MM-DD` days — exactly what a
  `type="date"` field emits — and the schema on the server clamps or defaults anything odd, so this side
  can stay a plain writer of whatever the user picks.
*/
export function AnalyticsFilters() {
  const [isPending, startTransition] = useTransition();

  const [range, setRange] = useQueryStates(
    {
      from: parseAsString.withDefault(''),
      to: parseAsString.withDefault(''),
    },
    { shallow: false, clearOnDefault: true, startTransition }
  );

  const isSet = range.from !== '' || range.to !== '';

  const handleFromChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    void setRange({ from: event.target.value || null });
  };

  const handleToChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    void setRange({ to: event.target.value || null });
  };

  const handleResetClick = (): void => {
    void setRange({ from: null, to: null });
  };

  return (
    <div aria-busy={isPending} className="grid items-end gap-3 sm:grid-cols-[auto_auto_auto_1fr]">
      <div className="flex flex-col gap-2">
        <Label htmlFor="analytics-from">From</Label>
        {/* The end bounds the start, so the picker cannot offer a start after the end. */}
        <Input id="analytics-from" type="date" value={range.from} max={range.to || undefined} onChange={handleFromChange} className="sm:w-44" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="analytics-to">To</Label>
        <Input id="analytics-to" type="date" value={range.to} min={range.from || undefined} onChange={handleToChange} className="sm:w-44" />
      </div>

      {isSet && (
        <Button type="button" variant="outline" onClick={handleResetClick}>
          Reset to last 30 days
        </Button>
      )}

      {isPending && (
        <span className="text-muted-foreground flex items-center gap-2 text-sm sm:justify-self-end">
          <Spinner className="size-3.5" />
          Updating…
        </span>
      )}
    </div>
  );
}
