import type { Metadata } from 'next';

import { AuthCard, ResendConfirmationForm } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Resend confirmation',
  robots: { index: false, follow: false },
};

export default function ResendConfirmationPage() {
  return (
    <AuthCard title="Resend confirmation" description="Enter your email address and we'll send a new confirmation link.">
      <ResendConfirmationForm />
    </AuthCard>
  );
}
