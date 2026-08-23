'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { GENDER_LABELS, GENDERS } from '@/constants';

import { isSuccess } from '@/lib/result';
import { ProfileUpdateInput, ProfileUpdateOutput, ProfileUpdateSchema } from '@/lib/schemas';

import { updateProfileAction } from '@/components/profile/actions';
import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import type { ProfileProps } from './profile.types';

/*
  Gender options for the edit form. The leading empty value is a real, submittable "none" — the
  schema maps it back to undefined — so a person can decline to say without leaving the control unset.
*/
const GENDER_SELECT_ITEMS: Record<string, string> = {
  '': 'Prefer not to say',
  ...Object.fromEntries(Object.values(GENDERS).map(gender => [gender, GENDER_LABELS[gender]])),
};

/*
  Editing your own account. Name, phone, gender and date of birth are written straight through and
  the topbar greets you by the saved name on the next paint. Email is the exception: the action holds
  a new address aside and mails it a link, so a changed address comes back as `pendingEmail` and the
  toast points at where the confirmation went rather than claiming the address is already yours.
*/
export function ProfileEditForm({ profile }: ProfileProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput, undefined, ProfileUpdateOutput>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? '',
      gender: profile.gender ?? '',
      // A stored ISO instant; the date input wants a bare `YYYY-MM-DD`, and slicing the UTC prefix
      // keeps the day the record holds rather than reinterpreting it in the browser's zone.
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    },
  });

  const handleFormSubmit = async (values: ProfileUpdateOutput): Promise<void> => {
    setFormError(null);

    const result = await updateProfileAction(values);

    if (isSuccess(result) && result.result) {
      // The action only fills `pendingEmail` when the address actually changed, so it is the honest
      // signal that a confirmation is on its way — not a comparison the form has to make itself.
      if (result.result.pendingEmail) {
        toast.success(`Confirmation link sent to ${result.result.pendingEmail}. Your current address stays in force until you follow it.`);
      } else {
        toast.success('Profile saved.');
      }

      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          {errors.name && <FormMessage>Enter your name.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-email">Email address</Label>
          <Input id="profile-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
          {errors.email ? (
            <FormMessage>Enter a valid email address.</FormMessage>
          ) : (
            <p className="text-muted-foreground text-xs">Changing this sends a confirmation link to the new address.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-phone">
            Phone <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            placeholder="01712345678"
            aria-invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
          {errors.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-gender">
            Gender <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select items={GENDER_SELECT_ITEMS} value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="profile-gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDER_SELECT_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2 sm:max-w-xs">
          <Label htmlFor="profile-dob">
            Date of birth <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input id="profile-dob" type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...register('dateOfBirth')} />
          {errors.dateOfBirth && <FormMessage>Enter a valid date of birth.</FormMessage>}
        </div>
      </div>

      <div className="border-border flex border-t pt-5 sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
