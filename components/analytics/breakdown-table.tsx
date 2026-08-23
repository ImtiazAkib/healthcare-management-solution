import { NamedCountDto } from '@/types';

import { MetricRow } from './metric-row';

type BreakdownTableProps = {
  title: string;
  /** What the rows are counted over, e.g. "Completed consultations, busiest first". */
  caption: string;
  rows: NamedCountDto[];
  /** Shown when the window held no rows for this breakdown, rather than an empty card. */
  emptyLabel: string;
};

/*
  A titled breakdown — consultations by doctor, or by department. The service returns the rows already
  ordered busiest-first and capped, so this only draws them; the max is taken here, once, so every row
  shares one scale. An empty window is a normal answer, so it states that plainly rather than drawing an
  empty frame.
*/
export function BreakdownTable({ title, caption, rows, emptyLabel }: BreakdownTableProps) {
  const max = rows.reduce((highest, row) => Math.max(highest, row.count), 0);

  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title">{title}</h2>
        <p className="text-muted-foreground text-sm">{caption}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(row => (
            <MetricRow key={row.id} name={row.name} count={row.count} max={max} />
          ))}
        </div>
      )}
    </section>
  );
}
