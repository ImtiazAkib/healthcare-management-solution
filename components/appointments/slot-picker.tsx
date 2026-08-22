'use client';

import { useEffect, useState, useTransition } from 'react';

import { isSuccess } from '@/lib/result';
import type { BookableSlot } from '@/lib/services';

import { Button, Spinner } from '@/components/ui';

import { availableSlotsAction } from './actions';

import type { SelectedSlot } from './appointments.types';

type SlotPickerProps = {
  doctorId: string;
  date: string;
  /** The start time currently chosen, so the matching button reads as selected. */
  value?: string;
  /** A reschedule passes its own appointment id, so its current slot is offered rather than hidden. */
  excludeAppointmentId?: string;
  onSelect: (slot: SelectedSlot) => void;
};

/*
  The free slots for a doctor on a day, fetched as the two above it are filled in. It reads
  through a Server Action rather than holding the schedule client-side: what is still free depends
  on what is already booked, which only the server knows and which can change under the picker.

  The fetch runs in a transition so `isPending` drives the spinner, and an ignore flag drops a
  response that arrives after the doctor or date has moved on again — the last pick wins, not the
  last request to return.
*/
export function SlotPicker({ doctorId, date, value, excludeAppointmentId, onSelect }: SlotPickerProps) {
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  /*
    The fetch runs only when both fields are set, and every state write happens after the await
    inside the transition — never synchronously in the effect body, which would fan out into
    cascading renders. Stale slots from a previous doctor are never shown: the render gates on the
    two fields first, and a change flips `isPending` to the loading state before the new list lands.
  */
  useEffect(() => {
    if (!doctorId || !date) {
      return;
    }

    let active = true;

    startTransition(async () => {
      const result = await availableSlotsAction(doctorId, date, excludeAppointmentId ?? null);

      if (!active) {
        return;
      }

      setSlots(isSuccess(result) ? result.result : []);
      setHasLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [doctorId, date, excludeAppointmentId]);

  if (!doctorId || !date) {
    return (
      <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
        Pick a doctor and a date to see free slots.
      </p>
    );
  }

  if (isPending || !hasLoaded) {
    // Initial load, and every refetch after the doctor or date moves — the last pick wins.
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-sm" aria-busy>
        <Spinner className="size-4" />
        Finding free slots…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
        No free slots — the doctor has no hours published that day, or they are all taken.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map(slot => {
        const isSelected = slot.startTime === value;

        const handleSlotClick = (): void => {
          onSelect({ startTime: slot.startTime, endTime: slot.endTime });
        };

        return (
          <Button
            key={`${slot.startTime}-${slot.endTime}`}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            aria-pressed={isSelected}
            onClick={handleSlotClick}>
            {slot.startTime}
          </Button>
        );
      })}
    </div>
  );
}
