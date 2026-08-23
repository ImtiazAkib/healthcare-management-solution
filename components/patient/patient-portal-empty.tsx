import { EmptyState } from '@/components/ui';

import type { PatientPortalEmptyProps } from './patient.types';

/*
  The portal's shared empty state. Every read area starts empty for a brand-new patient — no visits,
  no scripts, no results yet — and that is a normal first-run state, not a failure. A failed read
  never reaches here: the page throws to the error boundary before rendering, so this only ever says
  "there is genuinely nothing here yet".
*/
export function PatientPortalEmpty({ icon, title, description }: PatientPortalEmptyProps) {
  return <EmptyState icon={icon} title={title} description={description} />;
}
