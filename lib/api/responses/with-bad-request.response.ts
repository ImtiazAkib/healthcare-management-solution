import { NextResponse } from 'next/server';

/**
 * Shortcut method for returning bad request response.
 *
 * @param error Error to return.
 *
 * @returns Next response with 400 status code.
 */
export function withBadRequest(error: string) {
  return NextResponse.json({ error: error }, { status: 400 });
}
