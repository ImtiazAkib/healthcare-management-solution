'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, Spinner } from '@/components/ui';

import { confirmEmailChangeAction } from './registration.actions';

type EmailChangeVerificationProps = { token: string };

type VerificationState = { status: 'verifying' } | { status: 'success' } | { status: 'failure'; message: string };

/*
  Confirming a requested email change from the link's token — the mirror of `EmailVerification`, for
  the address a signed-in person asked to switch to rather than the one they first registered.

  The same single-use guard applies: the token is spent exactly once, and React's strict-mode
  double-effect would fire the action twice, the second call finding the token already gone and
  turning a good link into a failure. The ref makes the fire idempotent, and cleanup does not reset
  it, because the token is spent whether or not this component is still mounted.
*/
export function EmailChangeVerification({ token }: EmailChangeVerificationProps) {
  const [state, setState] = useState<VerificationState>({ status: 'verifying' });
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) {
      return;
    }

    hasFiredRef.current = true;

    const confirm = async (): Promise<void> => {
      const result = await confirmEmailChangeAction(token);

      if (isSuccess(result)) {
        setState({ status: 'success' });

        return;
      }

      setState({ status: 'failure', message: result.errors[0]?.error ?? 'This confirmation link is invalid or has expired.' });
    };

    void confirm();
  }, [token]);

  if (state.status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner className="text-muted-foreground size-6" />
        <p className="text-muted-foreground text-sm">Confirming your new email address…</p>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm">Your new email address is confirmed — it is the one you sign in with now.</p>
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
        You can request the change again from your{' '}
        <Link href={ROUTES.PROFILE.HREF} className="text-primary underline-offset-4 hover:underline">
          profile
        </Link>
        .
      </p>
    </div>
  );
}
