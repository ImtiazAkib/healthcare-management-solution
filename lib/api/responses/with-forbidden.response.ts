import { NextResponse } from 'next/server';

/**
 * Shortcut method for returning forbidden response.
 * Used when the session is valid but the role is not allowed to perform the action.
 *
 * @returns Next response with 403 status code.
 */
export function withForbidden() {
  return NextResponse.json({ error: 'Forbidden action.' }, { status: 403 });
}
