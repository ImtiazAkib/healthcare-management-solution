// Imported from the module rather than the `@/constants` barrel: this helper is reached
// from schemas that scripts load, and the barrel drags `lucide-react` with it.
import { BANGLADESH_PHONE_STORED_PATTERN } from '@/constants/users.const';

/**
 * Map whatever somebody typed onto the one stored shape, `+8801XXXXXXXXX`.
 *
 * Accepts the three forms a Bangladesh mobile number actually arrives in — the ten local
 * digits after a `+880` prefix field, the familiar `01XXXXXXXXX`, and the already
 * international `+8801XXXXXXXXX` — and normalizes all of them. Spaces and dashes are
 * dropped rather than refused; somebody writing `017 1234 5678` has typed a valid number.
 *
 * **The transform is idempotent**: its own output normalizes to itself. That is
 * load-bearing rather than tidy — a Server Action re-validates the values the browser
 * already normalized, because an action is a public endpoint and cannot trust its caller,
 * and a non-idempotent transform would fail its own output on that second pass.
 *
 * An empty string stays empty. The field is optional in every schema that composes it, and
 * emptiness is that schema's question to answer, not this function's.
 *
 * @param value - The number as typed.
 *
 * @returns The number in stored form, or the input unchanged if it is not recognizable.
 */
export function normalizeBangladeshPhone(value: string): string {
  const digits = value.replace(/[\s-]/g, '').trim();

  if (digits === '') {
    return '';
  }

  if (BANGLADESH_PHONE_STORED_PATTERN.test(digits)) {
    return digits;
  }

  // `01712345678` — the form everybody writes.
  if (/^01\d{9}$/.test(digits)) {
    return `+880${digits.slice(1)}`;
  }

  // `1712345678` — what a `+880` prefix field leaves behind.
  if (/^1\d{9}$/.test(digits)) {
    return `+880${digits}`;
  }

  // `8801712345678` — the international form with the plus dropped.
  if (/^8801\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  /*
    Returned unchanged rather than emptied. The schema's `.refine` is what reports it, and
    it can only say "check this number" usefully if the number the person typed is still
    there to be shown back to them.
  */
  return digits;
}
