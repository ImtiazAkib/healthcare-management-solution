'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ROLE_HOME } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { SignInInput, SignInOutput, SignInSchema } from '@/lib/schemas';
import { resolveSignInErrorMessage } from '@/lib/utils';

import { Button, FormMessage, Input, Label, PasswordInput, Spinner } from '@/components/ui';

import { signInAction } from './actions';
import { FormErrorAlert } from './form-error-alert';

/*
  The refusals a visitor may see, as sentences. They live here rather than in the action
  because the action returns a code — see `resolveSignInErrorMessage`. Every one of them is
  deliberately vague about whether the address exists.
*/
const ERROR_MESSAGES = {
  invalidCredentials: 'That email address and password do not match.',
  notVerified: 'Confirm your email address before signing in. The link is in your inbox.',
  notApproved: 'This account is waiting for approval.',
  deactivated: 'This account has been deactivated.',
  unexpected: 'Sign-in could not be completed. Try again.',
};

export function SignInForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  /*
    `isSubmitting` goes false the moment the action resolves, but a successful sign-in then
    navigates — and react-hook-form has already re-enabled the button by the time the new
    page paints. This holds the busy state through the redirect, so the button never flicks
    back to "Sign in" for the instant before the dashboard loads. It is never cleared,
    because the only way out of a successful submit is the navigation that unmounts this.
  */
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput, undefined, SignInOutput>({
    resolver: zodResolver(SignInSchema),
  });

  const isBusy = isSubmitting || isRedirecting;

  const handleFormSubmit = async (values: SignInOutput): Promise<void> => {
    setFormError(null);

    const result = await signInAction(values);

    if (isSuccess(result) && result.result) {
      setIsRedirecting(true);

      // Each role lands in its own area; `refresh()` re-renders the server tree so the new
      // session is picked up.
      router.replace(ROLE_HOME[result.result]);
      router.refresh();

      return;
    }

    setFormError(resolveSignInErrorMessage(result.errors[0]?.code ?? 0, ERROR_MESSAGES));
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && <FormErrorAlert message={formError} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="identifier">Email address</Label>
        {/*
          `type="text"`, not `email`. The browser's own validation would refuse to submit
          before the server ever saw it, which turns a typo into a different — and less
          honest — message than the one the service gives.
        */}
        <Input
          id="identifier"
          type="text"
          autoComplete="username"
          placeholder="you@hospital.example"
          aria-invalid={Boolean(errors.identifier)}
          {...register('identifier')}
        />
        {errors.identifier && <FormMessage>Enter your email address.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
        {errors.password && <FormMessage>Enter your password.</FormMessage>}
      </div>

      <Button type="submit" variant="default" disabled={isBusy} className="mt-1 w-full">
        {isBusy && <Spinner className="size-4" />}
        {isBusy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
