import type { Metadata } from 'next';

import { AuthCard, EmailChangeVerification } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Confirm your new email',
  robots: { index: false, follow: false },
};

type VerifyEmailChangePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailChangePage({ searchParams }: VerifyEmailChangePageProps) {
  // `searchParams` is a Promise in the App Router; a missing or non-string token becomes '', which
  // the action rejects as an invalid link — the same answer the malformed-token case gives.
  const { token } = await searchParams;
  const trimmedToken = typeof token === 'string' ? token.trim() : '';

  return (
    <AuthCard title="Confirm your new email" description="We're checking your confirmation link.">
      <EmailChangeVerification token={trimmedToken} />
    </AuthCard>
  );
}
