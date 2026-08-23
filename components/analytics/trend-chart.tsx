import { LineChart } from 'lucide-react';

import { DailyCountDto } from '@/types';

import { formatShortDate } from '@/lib/utils';

import { EmptyState } from '@/components/ui';

type TrendChartProps = {
  /** One row per day that held an appointment, already in date order. */
  data: DailyCountDto[];
};

/*
  The trend as a plain inline-SVG bar chart, drawn against the design tokens rather than pulled from a
  charting library — a whole dependency to draw a row of rectangles would be a poor trade. Two rules keep
  it honest across themes and widths:

  - It is colored with `fill-primary` / `currentColor`, never a hard-coded hex, so it is legible in both
    schemes with no dark variant.
  - Each bar takes a fixed slot, so a long window makes the chart wider than the card and the caller
    scrolls it in an `overflow-x` box rather than crushing the bars illegibly narrow at 375px.

  The whole chart is one `role="img"` with a sentence-long label, and every bar carries a `<title>` so a
  hover names its day — the shape is available to a screen reader without a parallel data table.
*/

// A fixed geometry the bars are laid out in. The viewBox is in these user units; the rendered pixel
// width scales with the day count so the slots keep their size as the window grows.
const SLOT = 26;
const BAR = 15;
const PLOT_TOP = 16;
const PLOT_HEIGHT = 150;
const AXIS_LABEL_HEIGHT = 22;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const CHART_HEIGHT = PLOT_TOP + PLOT_HEIGHT + AXIS_LABEL_HEIGHT;

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="No appointments in this window"
        description="Nothing was scheduled across the selected dates, so there is no trend to draw yet."
      />
    );
  }

  const max = data.reduce((highest, day) => Math.max(highest, day.count), 0);
  const scale = max || 1;

  const width = PAD_LEFT + PAD_RIGHT + data.length * SLOT;
  const baseline = PLOT_TOP + PLOT_HEIGHT;

  // The busiest day, for the accessible summary — the shape's one number worth stating in words.
  const peak = data.reduce((busiest, day) => (day.count > busiest.count ? day : busiest), data[0]);

  // Three sparse ticks — first, middle, last — so the axis is dated without labels colliding on a wide
  // window. On a one- or two-day window the set collapses to just the days present.
  const tickIndices = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]));

  const label = `Appointments per day from ${formatShortDate(data[0].date)} to ${formatShortDate(
    data[data.length - 1].date
  )}. Busiest day ${formatShortDate(peak.date)} with ${peak.count}.`;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="text-border block min-w-full">
        {/* The zero line, in the border token via currentColor. */}
        <line x1={PAD_LEFT} y1={baseline} x2={width - PAD_RIGHT} y2={baseline} stroke="currentColor" strokeWidth={1} />

        {data.map((day, index) => {
          const barHeight = Math.round((day.count / scale) * PLOT_HEIGHT);
          const x = PAD_LEFT + index * SLOT + (SLOT - BAR) / 2;
          const y = baseline - barHeight;

          return (
            <rect key={day.date} x={x} y={y} width={BAR} height={barHeight} rx={2} className="fill-primary">
              <title>{`${formatShortDate(day.date)}: ${day.count}`}</title>
            </rect>
          );
        })}

        {tickIndices.map(index => (
          <text
            key={data[index].date}
            x={PAD_LEFT + index * SLOT + SLOT / 2}
            y={baseline + 15}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]">
            {formatShortDate(data[index].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
