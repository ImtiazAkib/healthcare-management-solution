import type { Metadata } from 'next';

import { AuthCard, ForgotPasswordForm } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" description="Enter your email address and we'll send a link to reset it.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
