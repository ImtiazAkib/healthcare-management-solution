'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, Spinner } from '@/components/ui';

import { verifyEmailAction } from './registration.actions';

type EmailVerificationProps = { token: string };

type VerificationState = { status: 'verifying' } | { status: 'success' } | { status: 'failure'; message: string };

/*
  The verification is a single-use token, so it must be spent exactly once. React's strict-mode
  development double-invokes effects, which would otherwise fire the action twice — the first call
  consuming the token and the second finding it already gone, turning a good link into a failure.
  A ref guard makes the fire idempotent across the double-effect, and cleanup does not reset it,
  because the token is spent whether or not this component is still mounted.
*/
export function EmailVerification({ token }: EmailVerificationProps) {
  const [state, setState] = useState<VerificationState>({ status: 'verifying' });
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) {
      return;
    }

    hasFiredRef.current = true;

    const verify = async (): Promise<void> => {
      const result = await verifyEmailAction(token);

      if (isSuccess(result)) {
        setState({ status: 'success' });

        return;
      }

      setState({ status: 'failure', message: result.errors[0]?.error ?? 'This confirmation link is invalid or has expired.' });
    };

    void verify();
  }, [token]);

  if (state.status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner className="text-muted-foreground size-6" />
        <p className="text-muted-foreground text-sm">Confirming your email address…</p>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">Your email is confirmed — you can sign in now.</p>
        <Button variant="default" nativeButton={false} className="w-full" render={<Link href={ROUTES.SIGN_IN.HREF} />}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
        {state.message}
      </p>
      <p className="text-muted-foreground text-center text-sm">
        Need a new link?{' '}
        <Link href={ROUTES.RESEND_CONFIRMATION.HREF} className="text-primary underline-offset-4 hover:underline">
          Resend confirmation
        </Link>
      </p>
    </div>
  );
}
