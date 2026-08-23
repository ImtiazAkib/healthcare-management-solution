import { cn } from '@/lib/utils';

import type { MetricTone } from './analytics.types';

type MetricTileProps = {
  /** What the figure measures, e.g. "Attended". */
  label: string;
  /** The figure itself, already formatted — a count, `৳500.50`, `12 min`, or an em dash for "none". */
  value: string;
  /**
   * The window and the denominator the figure is read against, e.g. "of 40 appointments · 1–30 Jun".
   * Every tile carries one: a bare "32" invites the reader to guess what it is 32 of.
   */
  subLabel: string;
  tone?: MetricTone;
};

/*
  The color a figure is read in. Only applied to the value, never the label or the sub-label, so a
  tile reads as a number that happens to be tinted rather than a colored block. `muted` is the tone a
  figure takes when it is really an absence — a null average renders as "—" in muted, not a loud zero.
*/
const TONE_CLASS: Record<MetricTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  muted: 'text-muted-foreground',
};

/**
 * One metric on the overview: a label, the figure, and the window and denominator it is measured
 * against. The denominator is not optional — a figure with no stated base is a figure the reader has
 * to trust blindly, which is exactly what a reporting screen must not ask of them.
 */
export function MetricTile({ label, value, subLabel, tone = 'default' }: MetricTileProps) {
  return (
    <div className="border-border flex flex-col gap-1 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>

      <p className={cn('text-2xl font-semibold tabular-nums', TONE_CLASS[tone])}>{value}</p>

      <p className="text-muted-foreground text-xs text-pretty">{subLabel}</p>
    </div>
  );
}
