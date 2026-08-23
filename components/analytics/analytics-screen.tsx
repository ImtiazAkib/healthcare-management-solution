import { APPOINTMENT_STATUS_LABELS, APP_DATA } from '@/constants';
import { AnalyticsOverviewDto } from '@/types';

import { formatMoney, formatShortDate } from '@/lib/utils';

import { Badge, PageHeader } from '@/components/ui';

import { AnalyticsEmpty } from './analytics-empty';
import { AnalyticsFilters } from './analytics-filters';
import { BreakdownTable } from './breakdown-table';
import { MetricTile } from './metric-tile';
import { TrendChart } from './trend-chart';

type AnalyticsScreenProps = {
  overview: AnalyticsOverviewDto;
};

const EM_DASH = '—';
const CURRENCY = APP_DATA.CURRENCY.SYMBOL;

/** Whole-percent share, guarding the empty window so a zero denominator reads as 0%, not `NaN%`. */
function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/** `12 reports` / `1 report` — the count carries its own noun so a sub-label reads as a sentence. */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/*
  The overview, composed: the window's filters, a status strip, the metric tiles, the daily trend, and
  the two consultation breakdowns. It stays a server component — the figures arrive already computed and
  nothing here mutates — with the one interactive piece, the date filters, as a client child that writes
  the URL on its own.

  Every tile states the window and its denominator, because a figure with no stated base is one the
  reader has to trust blindly. The window sentence is built once here and threaded through.
*/
export function AnalyticsScreen({ overview }: AnalyticsScreenProps) {
  const { range, attendance, revenue, appointmentsByStatus } = overview;

  const window = `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;
  const attendedPct = percent(attendance.attended, attendance.total);
  const noShowPct = percent(attendance.noShow, attendance.total);
  const collectedPct = percent(revenue.collectedMinorUnits, revenue.billedMinorUnits);

  // "Nothing happened" is the honest reading only when every headline figure is zero — a window can hold
  // no appointments yet still have booked revenue, and vice versa, so all of them have to be empty.
  const isEmpty = attendance.total === 0 && revenue.billedMinorUnits === 0 && overview.newPatients === 0 && overview.labReleasedCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="How the facility ran over a window — attendance, waiting, diagnostics, revenue and registrations. No figure names a patient."
      />

      <AnalyticsFilters />

      {isEmpty ? (
        <AnalyticsEmpty />
      ) : (
        <div className="flex flex-col gap-6">
          {appointmentsByStatus.length > 0 && (
            <section className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-card-title">Appointments by status</h2>
                <p className="text-muted-foreground text-sm">
                  {plural(attendance.total, 'appointment')} over {window}.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {appointmentsByStatus.map(row => (
                  <Badge key={row.status} variant="neutral">
                    {APPOINTMENT_STATUS_LABELS[row.status]}
                    <span className="tabular-nums">{row.count}</span>
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Attended"
              value={String(attendance.attended)}
              subLabel={`${attendedPct}% of ${plural(attendance.total, 'appointment')} · ${window}`}
              tone="success"
            />

            <MetricTile
              label="No-shows"
              value={String(attendance.noShow)}
              subLabel={`${noShowPct}% of ${attendance.total} · ${plural(attendance.cancelled, 'cancellation')}`}
              tone="warning"
            />

            <MetricTile
              label="Average wait"
              value={overview.averageWaitMinutes === null ? EM_DASH : `${overview.averageWaitMinutes} min`}
              subLabel={overview.averageWaitMinutes === null ? 'No consultations to average in this window' : `Check-in to consultation · ${window}`}
              tone={overview.averageWaitMinutes === null ? 'muted' : 'default'}
            />

            <MetricTile
              label="Lab turnaround"
              value={overview.labTurnaroundHours === null ? EM_DASH : `${overview.labTurnaroundHours} h`}
              subLabel={
                overview.labTurnaroundHours === null
                  ? 'No reports released in this window'
                  : `Order to release · ${plural(overview.labReleasedCount, 'report')} released`
              }
              tone={overview.labTurnaroundHours === null ? 'muted' : 'default'}
            />

            <MetricTile label="Revenue billed" value={`${CURRENCY}${formatMoney(revenue.billedMinorUnits)}`} subLabel={window} tone="info" />

            <MetricTile
              label="Revenue collected"
              value={`${CURRENCY}${formatMoney(revenue.collectedMinorUnits)}`}
              subLabel={`${collectedPct}% of ${CURRENCY}${formatMoney(revenue.billedMinorUnits)} billed`}
              tone="success"
            />

            <MetricTile label="New patients" value={String(overview.newPatients)} subLabel={`Registered over ${window}`} tone="info" />
          </div>

          <section className="border-border flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-card-title">Appointments per day</h2>
              <p className="text-muted-foreground text-sm">Booked appointments across {window}.</p>
            </div>

            <TrendChart data={overview.appointmentsPerDay} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <BreakdownTable
              title="Consultations by doctor"
              caption="Completed consultations, busiest first."
              rows={overview.consultationsByDoctor}
              emptyLabel="No consultations were completed in this window."
            />

            <BreakdownTable
              title="Consultations by department"
              caption="Completed consultations, busiest first."
              rows={overview.consultationsByDepartment}
              emptyLabel="No consultations were completed in this window."
            />
          </div>
        </div>
      )}
    </div>
  );
}
