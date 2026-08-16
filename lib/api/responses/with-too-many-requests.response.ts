import { NextResponse } from 'next/server';

import { RATE_LIMIT_RETRY_AFTER_SECONDS } from '@/constants/rate-limit.const';

/**
 * Shortcut method for returning a rate-limited response.
 * Used when the caller is allowed to make this request but has made too many of them.
 *
 * `Retry-After` is a hint rather than the truth: the window decides, and a header that
 * reported the exact remaining time would tell anybody probing the endpoint how the budget
 * is tuned.
 *
 * @returns Next response with 429 status code.
 */
export function withTooManyRequests() {
  return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_RETRY_AFTER_SECONDS) } });
}
