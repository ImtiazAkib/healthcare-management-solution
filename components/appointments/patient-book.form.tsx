'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { AppointmentSelfBookInput, AppointmentSelfBookOutput, AppointmentSelfBookSchema } from '@/lib/schemas';

import { bookOwnAppointmentAction, patientAvailableSlotsAction } from '@/components/patient/actions';
import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';

import { SlotPicker } from './slot-picker';

import type { SelectedSlot } from './appointments.types';

/** A doctor a patient can book with, as the form's picker offers them — no department, the service derives it. */
type PatientBookDoctorOption = {
  doctorId: string;
  name: string;
  specialization: string;
};

type PatientBookFormProps = {
  doctors: PatientBookDoctorOption[];
};

/*
  A patient booking their own visit. It is the counter's booking form minus the patient picker: the
  patient is the signed-in account, never a value the form carries, so there is no one to choose. The
  two times are set for the caller from the slot the picker hands back — registered so the schema
  validates them, but no visible input carries them — and changing the doctor or the date clears the
  slot, because a slot only means something against the doctor and day it was offered for.

  The slots load through the patient-gated action, so the picker only ever sees availability the
  portal is allowed to compute. A slot the picker showed can be taken between reading it and booking
  it, so a well-formed submit can still come back refused — the banner carries the service's reason.
*/
export function PatientBookForm({ doctors }: PatientBookFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const hasDoctors = doctors.length > 0;

  const doctorItems: Record<string, string> = {};

  for (const option of doctors) {
    doctorItems[option.doctorId] = `${option.name} · ${option.specialization}`;
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentSelfBookInput, undefined, AppointmentSelfBookOutput>({
    resolver: zodResolver(AppointmentSelfBookSchema),
    defaultValues: {
      doctorId: '',
      date: '',
      startTime: '',
      endTime: '',
      reason: '',
    },
  });

  // Registered so the schema sees them; no visible input carries these — the slot picker writes them.
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

  const handleFormSubmit = async (values: AppointmentSelfBookOutput): Promise<void> => {
    setFormError(null);

    const result = await bookOwnAppointmentAction(values);

    if (isSuccess(result)) {
      toast.success('Appointment booked.');
      router.push(ROUTES.PATIENT_APPOINTMENTS.HREF);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.PATIENT_APPOINTMENTS.HREF);
  };

  const canSubmit = Boolean(doctorId) && Boolean(date) && Boolean(startTime);

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="book-doctor">Doctor</Label>
        {hasDoctors ? (
          <Controller
            control={control}
            name="doctorId"
            render={({ field }) => (
              <Select items={doctorItems} value={field.value} onValueChange={handleDoctorChange}>
                <SelectTrigger id="book-doctor" className="w-full">
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
            No doctors are listed yet — check back once a doctor publishes their hours.
          </p>
        )}
        {errors.doctorId && <FormMessage>Choose the doctor for your visit.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="book-date">Date</Label>
        <Input id="book-date" type="date" aria-invalid={Boolean(errors.date)} {...dateField} onChange={handleDateChange} />
        {errors.date && <FormMessage>Use a date such as 2026-08-23.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Slot</Label>
        <SlotPicker doctorId={doctorId} date={date} value={startTime} fetchSlots={patientAvailableSlotsAction} onSelect={handleSlotSelect} />
        {errors.startTime && <FormMessage>Choose a free slot.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="book-reason">
          Reason <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id="book-reason" rows={3} aria-invalid={Boolean(errors.reason)} {...register('reason')} />
        {errors.reason && <FormMessage>Keep the reason under 500 characters.</FormMessage>}
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? 'Booking…' : 'Book appointment'}
        </Button>
      </div>
    </form>
  );
}
