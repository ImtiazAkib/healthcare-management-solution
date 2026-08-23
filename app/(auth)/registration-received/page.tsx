import type { Metadata } from 'next';

import Link from 'next/link';

import { ROUTES } from '@/constants';

import { isMailConfigured } from '@/lib/mail';

import { AuthCard } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Check your inbox',
  robots: { index: false, follow: false },
};

/*
  The terminal screen after registering. Two gates stand between here and signing in — confirming
  the address and the hospital approving the account — and both are named so the wait is not a
  mystery. `isMailConfigured` is read here on the server: when mail is not wired up (a dev machine),
  the confirmation link is written to the server log instead of sent, and the note says so.
*/
export default function RegistrationReceivedPage() {
  return (
    <AuthCard title="Check your inbox" description="Your account has been created.">
      <div className="flex flex-col gap-5 text-sm">
        <p>
          We have sent a confirmation link to your email address. Open it to confirm the address. You can sign in once you have confirmed it and the
          hospital has approved your account.
        </p>

        {!isMailConfigured && (
          <p className="border-border bg-muted text-muted-foreground rounded-md border px-3 py-2 text-xs">
            Mail is not configured on this environment, so the confirmation link was written to the server log instead of sent.
          </p>
        )}

        <p className="text-muted-foreground">
          Did not get it?{' '}
          <Link href={ROUTES.RESEND_CONFIRMATION.HREF} className="text-primary underline-offset-4 hover:underline">
            Resend
          </Link>
        </p>

        <p className="text-muted-foreground border-border border-t pt-5 text-center">
          <Link href={ROUTES.SIGN_IN.HREF} className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
