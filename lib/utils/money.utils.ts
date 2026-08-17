import { APP_DATA } from '@/constants/app-data.const';

/*
  Money is stored as an integer count of minor units — paisa, cents — because floating-point
  money is a bug with a delay on it: `0.1 + 0.2` is not `0.3`, and an amount that survives one
  arithmetic operation intact will not survive a discount and a tax line later. These two
  helpers are the only places a price crosses between the integer it is stored as and the
  major-unit text a person types and reads.

  Imported from the constant module directly rather than through `@/constants`, so this stays
  safe to pull into a client bundle — the same reason `phone.utils.ts` reaches past the barrel.
*/
const MINOR_UNIT_DIGITS = APP_DATA.CURRENCY.MINOR_UNIT_DIGITS;
const MINOR_UNIT_FACTOR = 10 ** MINOR_UNIT_DIGITS;

// A major-unit amount as typed: whole units, or whole units and up to MINOR_UNIT_DIGITS places.
const MONEY_PATTERN = new RegExp(`^(\\d+)(?:\\.(\\d{1,${MINOR_UNIT_DIGITS}}))?$`);

/**
 * Parse a major-unit amount as typed (`'500.50'`, `'500'`, `'৳500.50'`) into an integer count
 * of minor units (`50050`).
 *
 * The arithmetic is integer-only on purpose: `500.50 * 100` in floating point is not `50050`,
 * so the whole and fractional halves are parsed as integers and combined, never multiplied as
 * a float. The currency symbol, spaces and thousands separators are tolerated so a pasted
 * amount does not have to be cleaned first.
 *
 * @param input - Amount in major units, as typed.
 *
 * @returns Integer minor units, or `NaN` when the input is not a valid money amount — the
 *          service schema turns that `NaN` into a field-level "Enter a valid price."
 */
export function toMinorUnits(input: string): number {
  const cleaned = input.trim().replace(new RegExp(`[${APP_DATA.CURRENCY.SYMBOL},\\s]`, 'g'), '');

  if (cleaned === '') {
    return NaN;
  }

  const match = MONEY_PATTERN.exec(cleaned);

  if (!match) {
    return NaN;
  }

  const whole = Number(match[1]);
  const fraction = (match[2] ?? '').padEnd(MINOR_UNIT_DIGITS, '0');

  return whole * MINOR_UNIT_FACTOR + Number(fraction);
}

/**
 * Render integer minor units (`50050`) as a fixed-precision major-unit string (`'500.50'`).
 *
 * Always writes `MINOR_UNIT_DIGITS` decimal places, so a column of prices lines up. The
 * currency symbol is left off — callers add `৳` where the layout wants it, which keeps the
 * returned value easy to copy as a plain number.
 *
 * @param minor - Integer minor units.
 *
 * @returns The amount in major units, to a fixed number of decimal places.
 */
export function formatMoney(minor: number): string {
  const whole = Math.trunc(minor / MINOR_UNIT_FACTOR);
  const fraction = Math.abs(minor % MINOR_UNIT_FACTOR)
    .toString()
    .padStart(MINOR_UNIT_DIGITS, '0');

  return `${whole}.${fraction}`;
}
