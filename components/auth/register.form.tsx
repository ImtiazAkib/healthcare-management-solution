'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { ROUTES } from '@/constants/routes.const';
import { GENDER_LABELS, GENDERS } from '@/constants/users.const';

import { isSuccess } from '@/lib/result';
import { PatientRegistrationInput, PatientRegistrationOutput, PatientRegistrationSchema } from '@/lib/schemas';

import {
  Button,
  FormMessage,
  Input,
  Label,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@/components/ui';

import { FormErrorAlert } from './form-error-alert';
import { registerPatientAction } from './registration.actions';

/*
  Gender options for the register form. The leading empty value is a real, submittable "none" —
  the schema maps it back to undefined — so a visitor can decline to say without leaving the
  control in an ambiguous unset state.
*/
const GENDER_SELECT_ITEMS: Record<string, string> = {
  '': 'Prefer not to say',
  ...Object.fromEntries(Object.values(GENDERS).map(gender => [gender, GENDER_LABELS[gender]])),
};

/*
  Self-registration: a patient claiming their own sign-in. The demographics beyond name, email and
  password are optional — the record fills in over the visits that follow. On success the account
  exists but is not yet usable, so the visitor lands on the "check your inbox" screen rather than
  anywhere signed in.
*/
export function RegisterPatientForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PatientRegistrationInput, undefined, PatientRegistrationOutput>({
    resolver: zodResolver(PatientRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      gender: '',
      dateOfBirth: '',
    },
  });

  const handleFormSubmit = (values: PatientRegistrationOutput): void => {
    setFormError(null);

    startTransition(async () => {
      const result = await registerPatientAction(values);

      if (isSuccess(result)) {
        router.push(ROUTES.REGISTRATION_RECEIVED.HREF);

        return;
      }

      setFormError(result.errors[0]?.error ?? 'Registration could not be completed. Try again.');
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && <FormErrorAlert message={formError} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-name">Full name</Label>
        <Input id="register-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
        {errors.name && <FormMessage>Enter your name.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-email">Email address</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email && <FormMessage>Enter a valid email address.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-password">Password</Label>
        <PasswordInput id="register-password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
        {errors.password ? (
          <FormMessage>Use at least 8 characters.</FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">At least 8 characters.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-phone">
          Phone <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="register-phone"
          type="tel"
          autoComplete="tel"
          placeholder="01712345678"
          aria-invalid={Boolean(errors.phone)}
          {...register('phone')}
        />
        {errors.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-gender">
          Gender <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Select items={GENDER_SELECT_ITEMS} value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger id="register-gender" className="w-full">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-dob">
          Date of birth <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id="register-dob" type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...register('dateOfBirth')} />
        {errors.dateOfBirth && <FormMessage>Enter a valid date of birth.</FormMessage>}
      </div>

      <Button type="submit" variant="default" disabled={isPending} className="mt-1 w-full">
        {isPending && <Spinner className="size-4" />}
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href={ROUTES.SIGN_IN.HREF} className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
