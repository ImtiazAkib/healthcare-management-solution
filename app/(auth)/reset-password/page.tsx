import type { Metadata } from 'next';

import { AuthCard, ResetPasswordForm } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  // `searchParams` is a Promise in the App Router; a missing or non-string token becomes '', which
  // the schema rejects as an invalid link.
  const { token } = await searchParams;
  const trimmedToken = typeof token === 'string' ? token.trim() : '';

  return (
    <AuthCard title="Set a new password" description="Choose a new password for your account.">
      <ResetPasswordForm token={trimmedToken} />
    </AuthCard>
  );
}
