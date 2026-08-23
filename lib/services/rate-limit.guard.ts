import { RateLimit } from '@/models/rate-limit.model';

import { RateLimitBudget } from '@/constants/rate-limit.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';

import { hashToken } from './token.hash';

const log = createLoggerWithContext('rate-limit.guard');

/**
 * Build a counter key: the scope, then the hashed identity. Two scopes keep two budgets apart, and
 * the identity is lower-cased before hashing so `Ada@x` and `ada@x` share one budget.
 *
 * @param scope - The budget's scope (`sign-in`, `register`, …).
 * @param identity - The raw identity being counted (an email, an IP, a user id).
 *
 * @returns The hashed key.
 */
function buildKey(scope: string, identity: string): string {
  return `${scope}:${hashToken(identity.trim().toLowerCase())}`;
}

/**
 * Consume one hit of a rate-limit budget, returning whether the request may proceed.
 *
 * A fixed window, incremented in one atomic round trip so two requests arriving together cannot both
 * read "under the limit" and both write. A row whose window has already closed (the TTL sweep lags by
 * up to a minute) is treated as a fresh window and reset. It counts in the **database**, not memory,
 * so the limit holds across a many-isolate deployment. And it **fails open**: a limiter is a guard on
 * top of a real control, never the control, so a database blip lets the request through rather than
 * locking everyone out.
 *
 * @param scope - The budget's scope.
 * @param identity - The identity to count against.
 * @param budget - The limit and window.
 *
 * @returns True when the request is within budget (or the check could not run).
 */
export async function consumeRateLimit(scope: string, identity: string, budget: RateLimitBudget): Promise<boolean> {
  try {
    await connectToDatabase();

    const now = Date.now();
    const windowMs = budget.WINDOW_MINUTES * 60 * 1000;
    const key = buildKey(scope, identity);

    const record = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { hits: 1 }, $setOnInsert: { windowStartedAt: new Date(now), expiresAt: new Date(now + windowMs) } },
      { upsert: true, returnDocument: 'after' }
    ).lean<{ hits: number; windowStartedAt: Date } | null>();

    if (!record) {
      return true;
    }

    // The previous window has closed — start a fresh one rather than counting into a stale total.
    if (record.windowStartedAt.getTime() + windowMs <= now) {
      await RateLimit.updateOne({ key }, { hits: 1, windowStartedAt: new Date(now), expiresAt: new Date(now + windowMs) });

      return true;
    }

    return record.hits <= budget.LIMIT;
  } catch (error) {
    log.error({ err: error, scope }, 'Rate-limit check failed; allowing the request');

    return true;
  }
}

/**
 * Clear a budget's counter for an identity — used after a legitimate success, so a real sign-in resets
 * the failure count and only *consecutive* failures accumulate.
 *
 * @param scope - The budget's scope.
 * @param identity - The identity to clear.
 */
export async function resetRateLimit(scope: string, identity: string): Promise<void> {
  try {
    await connectToDatabase();

    await RateLimit.deleteOne({ key: buildKey(scope, identity) });
  } catch (error) {
    // A failed reset only means the next legitimate attempt still counts against the window — harmless.
    log.warn({ err: error, scope }, 'Rate-limit reset failed');
  }
}
