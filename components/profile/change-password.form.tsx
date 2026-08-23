'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { isSuccess } from '@/lib/result';
import { PasswordChangeInput, PasswordChangeOutput, PasswordChangeSchema } from '@/lib/schemas';

import { changePasswordAction } from '@/components/profile/actions';
import { Button, FormMessage, Label, PasswordInput } from '@/components/ui';

/*
  Changing your own password from a live session. The current password is asked for even though the
  session is trusted: the realistic threat is a session left open on a ward computer, and the current
  password is the one thing the person who walked up to it does not have — the service checks it.

  The boxes clear on success. A password manager should not be left holding the old value in a filled
  field, and the empty form reads as "done" without a banner claiming it.
*/
export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput, undefined, PasswordChangeOutput>({
    resolver: zodResolver(PasswordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleFormSubmit = async (values: PasswordChangeOutput): Promise<void> => {
    setFormError(null);

    const result = await changePasswordAction(values);

    if (isSuccess(result)) {
      toast.success('Password changed.');
      reset();

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

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          {...register('currentPassword')}
        />
        {errors.currentPassword && <FormMessage>Enter your current password.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput id="new-password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} {...register('newPassword')} />
        {errors.newPassword ? (
          <FormMessage>Use at least 8 characters.</FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">At least 8 characters.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && <FormMessage>Both passwords must match.</FormMessage>}
      </div>

      <div className="border-border flex border-t pt-5 sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Changing…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
