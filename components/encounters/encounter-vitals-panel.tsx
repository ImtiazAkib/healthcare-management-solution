import { flagVital, formatShortDateTime } from '@/lib/utils';
import type { BandedVital, VitalsFlag } from '@/lib/utils';

import type { Vitals } from './encounters.types';

type EncounterVitalsPanelProps = {
  vitals: Vitals | null;
};

/** The readings with a normal band, shown in reading order with their unit. */
const BANDED_READINGS: { key: BandedVital; label: string; unit: string }[] = [
  { key: 'systolic', label: 'Systolic', unit: 'mmHg' },
  { key: 'diastolic', label: 'Diastolic', unit: 'mmHg' },
  { key: 'pulse', label: 'Pulse', unit: 'bpm' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: '/min' },
  { key: 'oxygenSaturation', label: 'Oxygen saturation', unit: '%' },
];

/*
  The value's color by where it sits: an out-of-band reading is worth a second look, never an
  alarm the software raises on its own — low leans warning, high leans destructive, a normal
  reading stays plain, and a reading that was not taken is muted.
*/
const FLAG_CLASS: Record<VitalsFlag, string> = {
  low: 'text-warning',
  high: 'text-destructive',
  normal: 'text-foreground',
};

const FLAG_LABEL: Record<VitalsFlag, string> = {
  low: 'Low',
  high: 'High',
  normal: '',
};

type ReadingCellProps = {
  label: string;
  unit: string;
  value: number | null | undefined;
  flag: VitalsFlag | null;
};

function ReadingCell({ label, unit, value, flag }: ReadingCellProps) {
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`text-sm font-medium ${hasValue && flag ? FLAG_CLASS[flag] : 'text-muted-foreground'}`}>
        {hasValue ? (
          <>
            {value} {unit}
            {flag && flag !== 'normal' && <span className="ml-1 text-xs font-normal">({FLAG_LABEL[flag]})</span>}
          </>
        ) : (
          '—'
        )}
      </dd>
    </div>
  );
}

/*
  The vitals taken at check-in, read-only here. A doctor reads them beside the consultation; they
  are recorded by a nurse against the appointment, not edited on this screen. Weight and height
  carry no normal band — there is no "abnormal" weight to mark, only a range of humans — so they
  are shown plainly.
*/
export function EncounterVitalsPanel({ vitals }: EncounterVitalsPanelProps) {
  if (!vitals) {
    return (
      <section className="border-border flex flex-col gap-2 rounded-lg border p-5">
        <h2 className="text-sm font-medium">Vitals</h2>
        <p className="text-muted-foreground text-sm">No vitals recorded at check-in yet.</p>
      </section>
    );
  }

  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium">Vitals</h2>
        <p className="text-muted-foreground text-xs">Recorded {formatShortDateTime(vitals.recordedAt)}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {BANDED_READINGS.map(reading => (
          <ReadingCell
            key={reading.key}
            label={reading.label}
            unit={reading.unit}
            value={vitals[reading.key]}
            flag={flagVital(reading.key, vitals[reading.key])}
          />
        ))}

        <ReadingCell label="Weight" unit="kg" value={vitals.weight} flag={null} />
        <ReadingCell label="Height" unit="cm" value={vitals.height} flag={null} />
      </dl>
    </section>
  );
}
