'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { AppointmentCreateInput, AppointmentCreateOutput, AppointmentCreateSchema } from '@/lib/schemas';

import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';

import { bookAppointmentAction } from './actions';
import { SlotPicker } from './slot-picker';

import type { DoctorOption, PatientSummaryDto, SelectedSlot } from './appointments.types';

type AppointmentBookFormProps = {
  doctorOptions: DoctorOption[];
  patientOptions: PatientSummaryDto[];
};

/*
  Booking is a page, not a dialog: it gets its own URL, survives a refresh, and has room for the
  patient, the doctor and the slot grid a popup would cramp.

  Three fields are set for the caller rather than typed by them. The department follows the doctor
  — a booking belongs to the doctor's department, so it is copied from the chosen option, never
  picked — and the two times come from the slot the picker hands back. They are registered so the
  schema validates them, but no visible input carries them; choosing a doctor or a slot writes
  them with `setValue`. Changing the doctor or the date clears the slot, because a slot only means
  something against the doctor and day it was offered for.

  A slot the picker showed can be taken by another writer between reading it and booking it, so a
  well-formed submit can still come back refused — the banner carries the service's reason,
  including "that slot was just taken".
*/
export function AppointmentBookForm({ doctorOptions, patientOptions }: AppointmentBookFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const hasDoctors = doctorOptions.length > 0;
  const hasPatients = patientOptions.length > 0;

  const patientItems: Record<string, string> = {};

  for (const option of patientOptions) {
    patientItems[option.patientId] = `${option.name} · ${option.medicalRecordNo}`;
  }

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
  } = useForm<AppointmentCreateInput, undefined, AppointmentCreateOutput>({
    resolver: zodResolver(AppointmentCreateSchema),
    defaultValues: {
      patientId: '',
      doctorId: '',
      departmentId: '',
      date: '',
      startTime: '',
      endTime: '',
      reason: '',
    },
  });

  // Registered so the schema sees them; no visible input carries these — the pickers write them.
  register('departmentId');
  register('startTime');
  register('endTime');

  const patientId = useWatch({ control, name: 'patientId' });
  const doctorId = useWatch({ control, name: 'doctorId' });
  const date = useWatch({ control, name: 'date' });
  const startTime = useWatch({ control, name: 'startTime' });

  const dateField = register('date');

  const handleDoctorChange = (value: unknown): void => {
    const nextDoctorId = String(value);
    const option = doctorOptions.find(candidate => candidate.doctorId === nextDoctorId);

    setValue('doctorId', nextDoctorId);
    setValue('departmentId', option ? option.departmentId : '');
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

  const handleFormSubmit = async (values: AppointmentCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await bookAppointmentAction(values);

    if (isSuccess(result)) {
      toast.success('Appointment booked.');
      router.push(ROUTES.ADMIN_APPOINTMENTS.HREF);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_APPOINTMENTS.HREF);
  };

  const canSubmit = Boolean(patientId) && Boolean(doctorId) && Boolean(date) && Boolean(startTime);

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="book-patient">Patient</Label>
        {hasPatients ? (
          <Controller
            control={control}
            name="patientId"
            render={({ field }) => (
              <Select items={patientItems} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="book-patient" className="w-full">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(patientItems).map(([value, label]) => (
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
            No patients registered yet — register a patient first.
          </p>
        )}
        {errors.patientId && <FormMessage>Choose the patient this booking is for.</FormMessage>}
      </div>

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
            No doctors yet — seed a doctor profile first.
          </p>
        )}
        {errors.doctorId && <FormMessage>Choose the doctor for this booking.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="book-date">Date</Label>
        <Input id="book-date" type="date" aria-invalid={Boolean(errors.date)} {...dateField} onChange={handleDateChange} />
        {errors.date && <FormMessage>Use a date such as 2026-08-23.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Slot</Label>
        <SlotPicker doctorId={doctorId} date={date} value={startTime} onSelect={handleSlotSelect} />
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
