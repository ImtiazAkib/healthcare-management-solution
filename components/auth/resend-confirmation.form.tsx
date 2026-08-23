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
import { resendConfirmationAction } from './registration.actions';

// The screen only needs the address's shape; the action re-validates and stays non-enumerating.
const ResendConfirmationSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

type ResendConfirmationValues = z.infer<typeof ResendConfirmationSchema>;

export function ResendConfirmationForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendConfirmationValues>({
    resolver: zodResolver(ResendConfirmationSchema),
    defaultValues: { email: '' },
  });

  const handleFormSubmit = (values: ResendConfirmationValues): void => {
    setFormError(null);

    startTransition(async () => {
      const result = await resendConfirmationAction(values);

      if (isSuccess(result)) {
        setIsSent(true);

        return;
      }

      setFormError(result.errors[0]?.error ?? 'The link could not be resent. Try again.');
    });
  };

  /*
    The same answer whether or not the address is registered: confirming an address exists would
    confirm that a person is a patient.
  */
  if (isSent) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">If that address is registered and still needs confirming, a new link is on its way.</p>
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
        <Label htmlFor="resend-email">Email address</Label>
        <Input
          id="resend-email"
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
        {isPending ? 'Sending…' : 'Resend confirmation'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link href={ROUTES.SIGN_IN.HREF} className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
