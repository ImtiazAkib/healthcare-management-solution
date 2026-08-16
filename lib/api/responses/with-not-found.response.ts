import { NextResponse } from 'next/server';

/**
 * Shortcut method for returning not found response.
 *
 * Also the correct answer for a clinical record the caller may not read. Confirming that a
 * record exists is itself a disclosure when the record is a person's medical file, so a
 * wrong-owner request gets this rather than `withForbidden()`.
 *
 * @returns Next response with 404 status code.
 */
export function withNotFound() {
  return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
}
