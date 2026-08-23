'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { PasswordResetInput, PasswordResetOutput, PasswordResetSchema } from '@/lib/schemas';

import { Button, FormMessage, Label, PasswordInput, Spinner } from '@/components/ui';

import { FormErrorAlert } from './form-error-alert';
import { resetPasswordAction } from './registration.actions';

type ResetPasswordFormProps = { token: string };

/*
  Set a new password from a reset link. The token proves the request on its own, so it rides along
  as a hidden registered field seeded from the prop rather than anything the visitor types. A
  malformed or expired token surfaces as a form-level failure from the action.
*/
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetInput, undefined, PasswordResetOutput>({
    resolver: zodResolver(PasswordResetSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const handleFormSubmit = (values: PasswordResetOutput): void => {
    setFormError(null);

    startTransition(async () => {
      const result = await resetPasswordAction(values);

      if (isSuccess(result)) {
        setIsDone(true);

        return;
      }

      setFormError(result.errors[0]?.error ?? 'Your password could not be set. Request a new link.');
    });
  };

  if (isDone) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">Your password is set — sign in.</p>
        <Button variant="default" nativeButton={false} className="w-full" render={<Link href={ROUTES.SIGN_IN.HREF} />}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && <FormErrorAlert message={formError} />}

      <input type="hidden" {...register('token')} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">New password</Label>
        <PasswordInput id="reset-password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
        {errors.password ? (
          <FormMessage>Use at least 8 characters.</FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">At least 8 characters.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-confirm-password">Confirm new password</Label>
        <PasswordInput
          id="reset-confirm-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && <FormMessage>Both passwords must match.</FormMessage>}
      </div>

      <Button type="submit" variant="default" disabled={isPending} className="mt-1 w-full">
        {isPending && <Spinner className="size-4" />}
        {isPending ? 'Setting password…' : 'Set new password'}
      </Button>
    </form>
  );
}
