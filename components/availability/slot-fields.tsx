'use client';

import { Controller } from 'react-hook-form';

import { DAYS_OF_WEEK, DAY_OF_WEEK_LABELS, SLOT_MINUTES } from '@/constants/schedule.const';

import type { AvailabilityCreateInput } from '@/lib/schemas';

import { FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

type SlotFieldsProps = {
  /*
    Create and edit render identical block fields, so they share this component. It is typed to
    the create shape — the edit dialog carries the `availabilityId` outside the form and merges
    it in on submit, which is what lets one `Control` serve both without a cast. The doctor
    picker is not here: only the create form chooses a doctor, because an edit never moves a
    block to another doctor.
  */
  register: UseFormRegister<AvailabilityCreateInput>;
  control: Control<AvailabilityCreateInput>;
  errors: FieldErrors<AvailabilityCreateInput>;
  /** Prefixes element ids so the page and the dialog can both mount these fields without a clash. */
  idPrefix: string;
};

/*
  One "sitting": the weekday it falls on, the hours it runs, how long each patient gets, the room,
  and the window of dates it applies over. Times submit as `HH:mm` and dates as `YYYY-MM-DD` — the
  exact zero-padded strings the model stores and the clash check compares — so the native time and
  date inputs hand the schema what it already expects, no parsing in between.
*/
export function SlotFields({ register, control, errors, idPrefix }: SlotFieldsProps) {
  const dayItems: Record<string, string> = {};

  for (const day of DAYS_OF_WEEK) {
    dayItems[day] = DAY_OF_WEEK_LABELS[day];
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-day`}>Day of week</Label>
        <Controller
          control={control}
          name="dayOfWeek"
          render={({ field }) => (
            <Select items={dayItems} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={`${idPrefix}-day`} className="w-full">
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
          )}
        />
        {errors.dayOfWeek && <FormMessage>Choose a day of the week.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-start`}>Start time</Label>
        <Input id={`${idPrefix}-start`} type="time" aria-invalid={Boolean(errors.startTime)} {...register('startTime')} />
        {errors.startTime && <FormMessage>Use a 24-hour time such as 09:30.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-end`}>End time</Label>
        <Input id={`${idPrefix}-end`} type="time" aria-invalid={Boolean(errors.endTime)} {...register('endTime')} />
        {errors.endTime && <FormMessage>The end time must be after the start time.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-slot`}>Slot length (minutes)</Label>
        <Input
          id={`${idPrefix}-slot`}
          type="number"
          min={SLOT_MINUTES.MIN}
          max={SLOT_MINUTES.MAX}
          aria-invalid={Boolean(errors.slotMinutes)}
          {...register('slotMinutes')}
        />
        {errors.slotMinutes ? (
          <FormMessage>
            Enter a whole number between {SLOT_MINUTES.MIN} and {SLOT_MINUTES.MAX}.
          </FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">How long one patient gets.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-room`}>
          Room <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id={`${idPrefix}-room`} placeholder="e.g. 204" aria-invalid={Boolean(errors.room)} {...register('room')} />
        {errors.room && <FormMessage>Room number is too long.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-from`}>Effective from</Label>
        <Input id={`${idPrefix}-from`} type="date" aria-invalid={Boolean(errors.effectiveFrom)} {...register('effectiveFrom')} />
        {errors.effectiveFrom && <FormMessage>Use a date such as 2026-08-17.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-to`}>
          Effective to <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id={`${idPrefix}-to`} type="date" aria-invalid={Boolean(errors.effectiveTo)} {...register('effectiveTo')} />
        {errors.effectiveTo ? (
          <FormMessage>The block cannot stop applying before it starts.</FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">Leave blank for no end date.</p>
        )}
      </div>
    </div>
  );
}
