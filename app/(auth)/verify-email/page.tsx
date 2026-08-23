import type { Metadata } from 'next';

import { AuthCard, EmailVerification } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  // `searchParams` is a Promise in the App Router; a missing or non-string token becomes '', which
  // the action rejects as an invalid link — the same answer the malformed-token case gives.
  const { token } = await searchParams;
  const trimmedToken = typeof token === 'string' ? token.trim() : '';

  return (
    <AuthCard title="Confirm your email" description="We're checking your confirmation link.">
      <EmailVerification token={trimmedToken} />
    </AuthCard>
  );
}
