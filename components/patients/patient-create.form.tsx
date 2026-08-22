'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { PatientRegisterInput, PatientRegisterOutput, PatientRegisterSchema } from '@/lib/schemas';

import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';

import { registerPatientAction } from './actions';
import { PatientClinicalEntries } from './patient-clinical-entries';
import { BLOOD_GROUP_ITEMS, GENDER_ITEMS } from './patients.types';

/*
  Registration is a page, not a dialog: it has its own URL, survives a refresh, and has room for
  the demographics, the clinical record and the emergency contact without cramming them into a
  popup.

  The allergy and condition lists live in ordinary state rather than react-hook-form (see
  `PatientClinicalEntries`) and are merged into the payload at submit; everything else is a
  registered field. On success the form lands on the new patient's record, its number in the
  toast.
*/
export function PatientCreateForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PatientRegisterInput, undefined, PatientRegisterOutput>({
    resolver: zodResolver(PatientRegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      gender: '',
      dateOfBirth: '',
      bloodGroup: '',
      address: '',
      emergencyContact: { name: '', relation: '', phone: '' },
    },
  });

  const handleFormSubmit = async (values: PatientRegisterOutput): Promise<void> => {
    setFormError(null);

    const result = await registerPatientAction({ ...values, allergies, chronicConditions });

    if (isSuccess(result) && result.result) {
      toast.success(`Patient registered — ${result.result.medicalRecordNo}.`);
      router.push(`${ROUTES.ADMIN_PATIENTS.HREF}/${result.result.patientId}`);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_PATIENTS.HREF);
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <fieldset className="flex flex-col gap-5">
        <legend className="text-foreground mb-1 text-sm font-medium">Who they are</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-name">Full name</Label>
            <Input id="register-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name && <FormMessage>Enter a name of up to 120 characters.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-email">Email address</Label>
            <Input id="register-email" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register('email')} />
            {errors.email ? (
              <FormMessage>Enter a valid email address.</FormMessage>
            ) : (
              <p className="text-muted-foreground text-xs">Used later when the patient claims their account.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-phone">
              Phone <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input id="register-phone" type="tel" placeholder="01712345678" aria-invalid={Boolean(errors.phone)} {...register('phone')} />
            {errors.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-dob">
              Date of birth <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input id="register-dob" type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...register('dateOfBirth')} />
            {errors.dateOfBirth && <FormMessage>Enter a valid date of birth.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-gender">
              Gender <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select items={GENDER_ITEMS} value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="register-gender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENDER_ITEMS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="text-foreground mb-1 text-sm font-medium">Clinical record</legend>

        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="register-blood-group">
            Blood group <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Controller
            control={control}
            name="bloodGroup"
            render={({ field }) => (
              <Select items={BLOOD_GROUP_ITEMS} value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="register-blood-group" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BLOOD_GROUP_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <PatientClinicalEntries
          label="Allergies"
          entries={allergies}
          onEntriesChange={setAllergies}
          placeholder="e.g. penicillin (rash, 2019)"
          addLabel="Add allergy"
          idPrefix="register-allergy"
        />

        <PatientClinicalEntries
          label="Chronic conditions"
          entries={chronicConditions}
          onEntriesChange={setChronicConditions}
          placeholder="e.g. type 2 diabetes"
          addLabel="Add condition"
          idPrefix="register-condition"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="text-foreground text-sm font-medium">
          Emergency contact <span className="text-muted-foreground text-xs font-normal">(optional — fill all three or leave blank)</span>
        </legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-contact-name">Name</Label>
            <Input id="register-contact-name" aria-invalid={Boolean(errors.emergencyContact?.name)} {...register('emergencyContact.name')} />
            {errors.emergencyContact?.name && <FormMessage>Give the contact a name.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-contact-relation">Relationship</Label>
            <Input
              id="register-contact-relation"
              placeholder="e.g. spouse"
              aria-invalid={Boolean(errors.emergencyContact?.relation)}
              {...register('emergencyContact.relation')}
            />
            {errors.emergencyContact?.relation && <FormMessage>How are they related?</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-contact-phone">Phone</Label>
            <Input
              id="register-contact-phone"
              type="tel"
              placeholder="01712345678"
              aria-invalid={Boolean(errors.emergencyContact?.phone)}
              {...register('emergencyContact.phone')}
            />
            {errors.emergencyContact?.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-address">
          Address <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id="register-address" rows={2} aria-invalid={Boolean(errors.address)} {...register('address')} />
        {errors.address && <FormMessage>Keep the address under 250 characters.</FormMessage>}
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Registering…' : 'Register patient'}
        </Button>
      </div>
    </form>
  );
}
