import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { ROLE_HOME } from '@/constants';

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
    </AuthCard>
  );
}
