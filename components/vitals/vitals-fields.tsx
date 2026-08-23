'use client';

import { useWatch } from 'react-hook-form';

import { VITALS_READINGS } from '@/constants';

import { flagVital } from '@/lib/utils';
import type { BandedVital, VitalsFlag } from '@/lib/utils';

import { FormMessage, Input, Label } from '@/components/ui';

import type { VitalsFieldsProps, VitalsReadingKey } from './vitals.types';

/*
  The value's color by where it sits, the same reading as the read-only panel: a low reading leans
  warning, a high one leans destructive, an in-range one stays muted. This flags for attention, it
  does not diagnose — the ranges are adult reference ranges, so a value outside one is worth a
  second look, not an alarm the software raises on its own.
*/
const FLAG_CLASS: Record<VitalsFlag, string> = {
  low: 'text-warning',
  high: 'text-destructive',
  normal: 'text-muted-foreground',
};

const FLAG_TEXT: Record<VitalsFlag, string> = {
  low: 'Below the usual range',
  high: 'Above the usual range',
  normal: 'Within the usual range',
};

/**
 * Whether a reading has a normal band to flag against. Weight and height do not — there is no
 * abnormal weight, only a range of humans — so they never carry a flag.
 *
 * @param key - The reading key.
 *
 * @returns True for the six banded readings.
 */
function isBandedVital(key: VitalsReadingKey): key is BandedVital {
  return key !== 'weight' && key !== 'height';
}

/**
 * Read a watched reading value as a number for a live calculation.
 *
 * A number input hands react-hook-form a string, and an untouched box hands it an empty string —
 * "not taken", which is not zero — so both collapse to null rather than a misleading 0.
 *
 * @param value - The current field value.
 *
 * @returns The number, or null when the box is blank or not a number.
 */
export function readingToNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

/*
  The eight reading inputs, driven by the one catalog so the form and the read panel cannot drift.
  Each is registered on the parent form so the schema validates it and the same form submits it; a
  banded reading flags itself against its normal range as it is typed, from the watched value.
*/
export function VitalsFields({ register, errors, control }: VitalsFieldsProps) {
  // One subscription to the whole form, indexed per reading — `useWatch` memoizes cleanly where a
  // bare `watch()` call in render cannot, and a hook cannot be called inside the map below.
  const values = useWatch({ control });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {VITALS_READINGS.map(reading => {
        const fieldError = errors[reading.key];
        const flag = isBandedVital(reading.key) ? flagVital(reading.key, readingToNumber(values[reading.key])) : null;

        return (
          <div key={reading.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`vitals-${reading.key}`}>{reading.label}</Label>
              <span className="text-muted-foreground text-xs">{reading.unit}</span>
            </div>

            <Input
              id={`vitals-${reading.key}`}
              type="number"
              inputMode="decimal"
              step={reading.step}
              aria-label={`${reading.label} in ${reading.unit}`}
              aria-invalid={Boolean(fieldError)}
              {...register(reading.key)}
            />

            {fieldError ? (
              <FormMessage>{fieldError.message ?? 'Check this reading.'}</FormMessage>
            ) : (
              flag && <p className={`text-xs ${FLAG_CLASS[flag]}`}>{FLAG_TEXT[flag]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
