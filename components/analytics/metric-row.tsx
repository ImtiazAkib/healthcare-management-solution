type MetricRowProps = {
  /** The named subject — a doctor or a department. Never a patient; this screen carries no patient names. */
  name: string;
  count: number;
  /** The largest count in the breakdown, so every bar is drawn to the same scale. */
  max: number;
};

/*
  One row of a breakdown: a name, a proportional bar, and the count. The bar is what turns a column of
  numbers into a shape the eye can rank at a glance — its width is the row's share of the busiest row,
  not of the total, so the leader always fills the track and the rest read relative to it.
*/
export function MetricRow({ name, count, max }: MetricRowProps) {
  // Guard the division: an all-zero breakdown never reaches here (the table shows its empty state), but
  // a defensive `max || 1` keeps a stray zero from producing `NaN%`.
  const share = Math.round((count / (max || 1)) * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm sm:w-40" title={name}>
        {name}
      </span>

      <div className="bg-primary/15 h-2 flex-1 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-primary h-full rounded-full" style={{ width: `${share}%` }} />
      </div>

      <span className="text-muted-foreground w-10 shrink-0 text-right text-sm tabular-nums">{count}</span>
    </div>
  );
}
