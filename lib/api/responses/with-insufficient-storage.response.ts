import { NextResponse } from 'next/server';

import { CODES } from '@/constants/codes.const';

import { createError } from '@/lib/result';

/**
 * Shortcut for refusing an upload the bucket has no room for.
 *
 * `507 Insufficient Storage` rather than `400`: the request was well formed and the caller
 * was allowed to make it — the server simply cannot hold the result. The body carries the
 * shared `STORAGE_FULL` code in the same `{ errors }` shape the upload forms read from any
 * other refusal, so the client maps it to the storage message with no special case.
 *
 * @returns Next response with a 507 status code.
 */
export function withInsufficientStorage() {
  const { CODE, MESSAGE } = CODES.BUSINESS.COMMON.STORAGE_FULL;

  return NextResponse.json({ errors: [createError(CODE, MESSAGE)] }, { status: 507 });
}
