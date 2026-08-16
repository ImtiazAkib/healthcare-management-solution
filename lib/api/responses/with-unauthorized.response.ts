import { NextResponse } from 'next/server';

/**
 * Shortcut method for returning unauthorized response.
 * Used when the request carries no valid session.
 *
 * @returns Next response with 401 status code.
 */
export function withUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized action.' }, { status: 401 });
}
