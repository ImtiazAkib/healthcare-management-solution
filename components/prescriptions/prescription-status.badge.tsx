import { Badge } from '@/components/ui';

type PrescriptionStatusBadgeProps = {
  /** True once a later prescription has replaced this one. */
  superseded: boolean;
};

/**
 * A prescription's standing at a glance: an active script is a live instruction; a replaced one is
 * kept for the record but no longer the one to dispense against.
 */
export function PrescriptionStatusBadge({ superseded }: PrescriptionStatusBadgeProps) {
  if (superseded) {
    return <Badge variant="neutral">Replaced</Badge>;
  }

  return <Badge variant="success">Active</Badge>;
}
