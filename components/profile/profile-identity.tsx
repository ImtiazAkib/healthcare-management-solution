import { USER_ROLE_LABELS } from '@/constants';

import type { ProfileProps } from './profile.types';

/*
  The hospital's record of you: the role you hold and the number it filed you under — a patient's
  medical record number, or a doctor's registration number. These are assigned, not described, so the
  card is deliberately read-only and says so. Nothing here has an input; the editable account fields
  live in the forms below.

  A staff role that carries neither number still gets the role row, so the card never renders empty.
*/
export function ProfileIdentity({ profile }: ProfileProps) {
  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title">Identity</h2>
        <p className="text-muted-foreground text-sm">Assigned by the hospital and not editable here.</p>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">Role</dt>
          <dd className="text-sm font-medium">{USER_ROLE_LABELS[profile.role]}</dd>
        </div>

        {profile.medicalRecordNo && (
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">Medical record number</dt>
            <dd className="font-mono text-sm font-medium">{profile.medicalRecordNo}</dd>
          </div>
        )}

        {profile.registrationNo && (
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">Registration number</dt>
            <dd className="font-mono text-sm font-medium">{profile.registrationNo}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
