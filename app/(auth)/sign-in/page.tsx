import type { Metadata } from 'next';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ROLE_HOME, ROUTES } from '@/constants';

import { getSessionUser } from '@/lib/auth';

import { AuthCard, SignInForm } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Sign in',
  // Never indexed, whatever ROBOTS_ENABLED says. This is the door, not the shop window.
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  /*
    `getSessionUser()` rather than a guard: this page is public by definition, and the
    question is not "may you be here" but "are you already in". Nobody signs in twice.
  */
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(ROLE_HOME[sessionUser.role]);
  }

  return (
    <AuthCard title="Sign in" description="Use the email address the hospital holds for you.">
      <SignInForm />

      <div className="text-muted-foreground flex flex-col gap-2 text-center text-sm">
        <p>
          <Link href={ROUTES.FORGOT_PASSWORD.HREF} className="text-primary underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </p>
        <p>
          New here?{' '}
          <Link href={ROUTES.REGISTER.HREF} className="text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
