import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireSession } from '@/lib/auth';
import { ProfileService } from '@/lib/services';

import { ChangePasswordForm, ProfileEditForm, ProfileEmergencyContactForm, ProfileIdentity, ProfileSummary } from '@/components/profile';
import { PageHeader } from '@/components/ui';

const profileService = new ProfileService();

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

/*
  The one signed-in page every role shares. `requireSession` rather than `requireRole`: nothing here
  belongs to an area, so any authenticated account may edit its own account — the service reads the
  profile from the session, never a value on the page, so there is nothing to point at somebody else.

  A failed read throws rather than rendering an empty form: an unreachable database must not look like
  an account with no name. The emergency-contact form is patient-only, because it edits a patient
  record a staff account does not have.
*/
export default async function ProfilePage() {
  const session = await requireSession();

  const result = await profileService.getProfile(session);

  if (!result.success || !result.result) {
    throw new Error('Could not load your profile. Please try again.');
  }

  const profile = result.result;
  const isPatient = session.role === USER_ROLES.PATIENT;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Your account details, your password, and how the hospital reaches you." />

      <ProfileSummary profile={profile} />

      <ProfileIdentity profile={profile} />

      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-card-title">Account details</h2>
          <p className="text-muted-foreground text-sm">Update your name, contact number and demographics.</p>
        </div>

        <ProfileEditForm profile={profile} />
      </section>

      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-card-title">Password</h2>
          <p className="text-muted-foreground text-sm">Confirm your current password to set a new one.</p>
        </div>

        <ChangePasswordForm />
      </section>

      {isPatient && (
        <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-card-title">Emergency contact</h2>
            <p className="text-muted-foreground text-sm">Who to call in an emergency, and where you live.</p>
          </div>

          <ProfileEmergencyContactForm profile={profile} />
        </section>
      )}
    </div>
  );
}
