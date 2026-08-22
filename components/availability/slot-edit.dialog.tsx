'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { AvailabilityDto } from '@/types';

import { isSuccess } from '@/lib/result';
import type { SingleResult } from '@/lib/result';
import { AvailabilityCreateInput, AvailabilityCreateOutput, AvailabilityCreateSchema } from '@/lib/schemas';

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';

import { updateAvailabilityAction } from './actions';
import { ConflictNotice } from './conflict-notice';
import { SlotFields } from './slot-fields';

type SlotEditDialogProps = {
  block: AvailabilityDto;
  onUpdated: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Mounted only while a block is selected, and keyed on that block's id by the parent. That is
  what fills the form: `defaultValues` is read once per mount, so a fresh mount per block replaces
  the effect that would otherwise copy it in — and clears a stale error from the previous attempt
  for free.

  The form is typed to the create shape so it can share `SlotFields` with the create page. The
  `availabilityId` the update needs is not a field the user edits, and the doctor never moves, so
  the submit builds the update payload from the block's id plus the seven edited fields — the
  create form's `doctorId` is simply not carried through, matching an update schema that has none.

  A clash comes back carrying up to two reasons at once, so the failure is held whole and handed
  to `ConflictNotice` rather than reduced to a single line.
*/
export function SlotEditDialog({ block, onUpdated, onOpenChange }: SlotEditDialogProps) {
  const [failure, setFailure] = useState<SingleResult<AvailabilityDto> | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AvailabilityCreateInput, undefined, AvailabilityCreateOutput>({
    resolver: zodResolver(AvailabilityCreateSchema),
    defaultValues: {
      doctorId: block.doctorId,
      dayOfWeek: block.dayOfWeek,
      startTime: block.startTime,
      endTime: block.endTime,
      slotMinutes: block.slotMinutes,
      room: block.room ?? '',
      effectiveFrom: block.effectiveFrom,
      effectiveTo: block.effectiveTo ?? '',
    },
  });

  const handleFormSubmit = async (values: AvailabilityCreateOutput): Promise<void> => {
    setFailure(null);

    const result = await updateAvailabilityAction({
      availabilityId: block.availabilityId,
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      slotMinutes: values.slotMinutes,
      room: values.room,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo,
    });

    if (isSuccess(result)) {
      onUpdated();

      return;
    }

    setFailure(result);
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit availability</DialogTitle>
          <DialogDescription>
            Correct the day, hours, slot length, room or the dates this sitting applies over. The doctor stays the same.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {failure && <ConflictNotice result={failure} />}

          <SlotFields idPrefix="edit" register={register} control={control} errors={errors} />

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
              Cancel
            </Button>

            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
