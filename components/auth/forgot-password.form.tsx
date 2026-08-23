'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, FormMessage, Input, Label, Spinner } from '@/components/ui';

import { FormErrorAlert } from './form-error-alert';
import { requestPasswordResetAction } from './registration.actions';

// Only the address's shape; the action re-validates and answers the same either way.
const ForgotPasswordSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleFormSubmit = (values: ForgotPasswordValues): void => {
    setFormError(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction(values);

      if (isSuccess(result)) {
        setIsSent(true);

        return;
      }

      setFormError(result.errors[0]?.error ?? 'The reset link could not be sent. Try again.');
    });
  };

  /*
    Non-enumerating: the reply is the same whether or not the address is registered, so it never
    reveals who has an account.
  */
  if (isSent) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">If that address is registered, a reset link is on its way.</p>
        <p className="text-muted-foreground text-center text-sm">
          <Link href={ROUTES.SIGN_IN.HREF} className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && <FormErrorAlert message={formError} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email">Email address</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email && <FormMessage>Enter a valid email address.</FormMessage>}
      </div>

      <Button type="submit" variant="default" disabled={isPending} className="mt-1 w-full">
        {isPending && <Spinner className="size-4" />}
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link href={ROUTES.SIGN_IN.HREF} className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
