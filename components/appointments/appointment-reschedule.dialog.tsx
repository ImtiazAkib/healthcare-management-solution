'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { isSuccess } from '@/lib/result';
import { AppointmentRescheduleInput, AppointmentRescheduleOutput, AppointmentRescheduleSchema } from '@/lib/schemas';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';

import { rescheduleAppointmentAction } from './actions';
import { SlotPicker } from './slot-picker';

import type { AppointmentRow, DoctorOption, SelectedSlot } from './appointments.types';

type AppointmentRescheduleDialogProps = {
  appointment: AppointmentRow;
  doctorOptions: DoctorOption[];
  onRescheduled: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Mounted only while an appointment is selected, and keyed on its id by the parent. That is what
  fills the form: `defaultValues` is read once per mount, so a fresh mount per appointment replaces
  the effect that would otherwise copy it in — and clears a stale error from the previous attempt.

  The appointment id and the two chosen times are not fields the user types: the id is fixed and
  the times come from the slot the picker hands back, so all three are registered (for the schema)
  and written programmatically. A reschedule may move the doctor, so the doctor picker is here —
  changing it, or the date, clears the slot, which only means something against the doctor and day
  it was offered for.
*/
export function AppointmentRescheduleDialog({ appointment, doctorOptions, onRescheduled, onOpenChange }: AppointmentRescheduleDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const doctorItems: Record<string, string> = {};

  for (const option of doctorOptions) {
    doctorItems[option.doctorId] = `${option.name} · ${option.specialization}`;
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentRescheduleInput, undefined, AppointmentRescheduleOutput>({
    resolver: zodResolver(AppointmentRescheduleSchema),
    defaultValues: {
      appointmentId: appointment.appointmentId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      reason: appointment.reason ?? '',
    },
  });

  register('appointmentId');
  register('startTime');
  register('endTime');

  const doctorId = useWatch({ control, name: 'doctorId' });
  const date = useWatch({ control, name: 'date' });
  const startTime = useWatch({ control, name: 'startTime' });

  const dateField = register('date');

  const handleDoctorChange = (value: unknown): void => {
    setValue('doctorId', String(value));
    setValue('startTime', '');
    setValue('endTime', '');
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    void dateField.onChange(event);
    setValue('startTime', '');
    setValue('endTime', '');
  };

  const handleSlotSelect = (slot: SelectedSlot): void => {
    setValue('startTime', slot.startTime);
    setValue('endTime', slot.endTime);
  };

  const handleFormSubmit = async (values: AppointmentRescheduleOutput): Promise<void> => {
    setFormError(null);

    const result = await rescheduleAppointmentAction({ ...values, appointmentId: appointment.appointmentId });

    if (isSuccess(result)) {
      onRescheduled();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  const canSubmit = Boolean(doctorId) && Boolean(date) && Boolean(startTime);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Move {appointment.patientName} to a new time, and a new doctor if needed. The new slot is checked against the doctor&apos;s published
            hours.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-doctor">Doctor</Label>
            <Controller
              control={control}
              name="doctorId"
              render={({ field }) => (
                <Select items={doctorItems} value={field.value} onValueChange={handleDoctorChange}>
                  <SelectTrigger id="reschedule-doctor" className="w-full">
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
            {errors.doctorId && <FormMessage>Choose the doctor for this booking.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-date">Date</Label>
            <Input id="reschedule-date" type="date" aria-invalid={Boolean(errors.date)} {...dateField} onChange={handleDateChange} />
            {errors.date && <FormMessage>Use a date such as 2026-08-23.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Slot</Label>
            <SlotPicker
              doctorId={doctorId}
              date={date}
              value={startTime}
              excludeAppointmentId={appointment.appointmentId}
              onSelect={handleSlotSelect}
            />
            {errors.startTime && <FormMessage>Choose a free slot.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-reason">
              Reason <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea id="reschedule-reason" rows={2} aria-invalid={Boolean(errors.reason)} {...register('reason')} />
            {errors.reason && <FormMessage>Keep the reason under 500 characters.</FormMessage>}
          </div>

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
              Cancel
            </Button>

            <Button type="submit" variant="default" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? 'Saving…' : 'Save new time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
