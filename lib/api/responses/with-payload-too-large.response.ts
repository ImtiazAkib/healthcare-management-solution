import { NextResponse } from 'next/server';

import { createError } from '@/lib/result';

/**
 * Shortcut for refusing a request whose body is larger than the handler will hold.
 *
 * `413 Payload Too Large`, carrying the same `{ errors }` shape the upload forms already read from a
 * refusal — so passing the size-limit code the service would have raised lets the client map it to
 * the existing "file too large" message with no special case.
 *
 * @param code - The size-limit error code for this upload kind.
 * @param message - The matching message.
 *
 * @returns Next response with a 413 status code.
 */
export function withPayloadTooLarge(code: number, message: string) {
  return NextResponse.json({ errors: [createError(code, message)] }, { status: 413 });
}
