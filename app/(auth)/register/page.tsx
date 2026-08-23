import type { Metadata } from 'next';

import { AuthCard, RegisterPatientForm } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Register',
  // Never indexed: an account-creation form is not a page a search engine should surface.
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" description="Register as a patient to book appointments and see your records.">
      <RegisterPatientForm />
    </AuthCard>
  );
}
