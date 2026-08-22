'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { AvailabilityDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';
import { DAYS_OF_WEEK, SLOT_MINUTES } from '@/constants/schedule.const';

import { isSuccess } from '@/lib/result';
import type { SingleResult } from '@/lib/result';
import { AvailabilityCreateInput, AvailabilityCreateOutput, AvailabilityCreateSchema } from '@/lib/schemas';

import { Button, FormMessage, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import { createAvailabilityAction } from './actions';
import { ConflictNotice } from './conflict-notice';
import { SlotFields } from './slot-fields';

import type { DoctorOption } from './availability.types';

type SlotCreateFormProps = {
  doctorOptions: DoctorOption[];
};

/*
  A page rather than a dialog: publishing a block gets its own URL, which makes it linkable and
  survivable on a refresh, and gives the block fields room a popup would not.

  The doctor picker lives here and only here — an edit never moves a block to another doctor, so
  `SlotFields` (shared with the edit dialog) carries the seven fields the two have in common and
  leaves the doctor to this form. When no doctor record has been seeded yet the picker is a
  disabled note rather than an empty select: doctor profiles are set up in a separate flow, so an
  empty list is the expected early state.

  A clash comes back as a failed result carrying up to two reasons at once — the doctor is busy
  *and* the room is taken — so the failure is held whole and handed to `ConflictNotice`, which
  lists every reason, rather than reduced to a single error line.
*/
export function SlotCreateForm({ doctorOptions }: SlotCreateFormProps) {
  const router = useRouter();
  const [failure, setFailure] = useState<SingleResult<AvailabilityDto> | null>(null);

  const hasDoctors = doctorOptions.length > 0;

  const doctorItems: Record<string, string> = {};

  for (const option of doctorOptions) {
    doctorItems[option.doctorId] = `${option.name} · ${option.specialization}`;
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AvailabilityCreateInput, undefined, AvailabilityCreateOutput>({
    resolver: zodResolver(AvailabilityCreateSchema),
    defaultValues: {
      doctorId: '',
      dayOfWeek: DAYS_OF_WEEK[0],
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: SLOT_MINUTES.DEFAULT,
      room: '',
      effectiveFrom: '',
      effectiveTo: '',
    },
  });

  const handleFormSubmit = async (values: AvailabilityCreateOutput): Promise<void> => {
    setFailure(null);

    const result = await createAvailabilityAction(values);

    if (isSuccess(result)) {
      toast.success('Availability published.');
      router.push(ROUTES.ADMIN_AVAILABILITY.HREF);
      router.refresh();

      return;
    }

    setFailure(result);
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_AVAILABILITY.HREF);
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {failure && <ConflictNotice result={failure} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="create-doctor">Doctor</Label>
        {hasDoctors ? (
          <Controller
            control={control}
            name="doctorId"
            render={({ field }) => (
              <Select items={doctorItems} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="create-doctor" className="w-full">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(doctorItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
            No doctors yet — seed a doctor profile first.
          </p>
        )}
        {errors.doctorId && <FormMessage>Choose the doctor these hours belong to.</FormMessage>}
      </div>

      <SlotFields idPrefix="create" register={register} control={control} errors={errors} />

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting || !hasDoctors}>
          {isSubmitting ? 'Publishing…' : 'Publish availability'}
        </Button>
      </div>
    </form>
  );
}
