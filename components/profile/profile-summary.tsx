import { USER_ROLE_LABELS } from '@/constants';

import { Badge } from '@/components/ui';

import type { ProfileProps } from './profile.types';

/*
  The account at a glance: who you are signed in as, the role that decides what you see, and whether
  the account is approved. Purely presentational — a server component with no state of its own — so
  the editable forms below it stay the only things that write.

  When an email change is in flight, the note names the address the confirmation went to. The old
  address is still the one in force until the link is followed, which is why the change reads as
  "pending" rather than done.
*/
export function ProfileSummary({ profile }: ProfileProps) {
  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title">{profile.name}</h2>
        <p className="text-muted-foreground text-sm">{profile.email}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{USER_ROLE_LABELS[profile.role]}</Badge>
        <Badge variant={profile.isApproved ? 'success' : 'warning'}>{profile.isApproved ? 'Approved' : 'Pending approval'}</Badge>
      </div>

      {profile.pendingEmail && (
        <p className="border-info/40 bg-info/10 text-info rounded-md border px-3 py-2 text-sm">
          Confirmation pending to <span className="font-medium">{profile.pendingEmail}</span>. The change takes effect once you follow the link we
          sent — until then you sign in with your current address.
        </p>
      )}
    </section>
  );
}
