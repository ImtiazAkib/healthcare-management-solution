/**
 * What a 429 tells the caller to wait, in seconds.
 *
 * A hint rather than the truth: the window decides, and a header reporting the exact
 * remaining time would tell anybody probing the endpoint how the budget is tuned.
 *
 * The limiter itself — the windows, the keys and the counter collection — lands in step
 * 21a. This one value exists now because `withTooManyRequests()` needs it, and a magic
 * number in a response header is a value nobody can find later.
 */
export const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

/** The collection the counters live in — named so the model and the guard cannot drift on it. */
export const RATE_LIMIT_COLLECTION = 'ratelimits';

/**
 * The budgets, each a limit over a fixed window of minutes.
 *
 * `SIGN_IN` counts **failures** per identifier as typed — a wrong password or an unknown address alike,
 * so the two are indistinguishable and neither can be used to enumerate — and is cleared on a real
 * sign-in, so it bounds *consecutive* failures rather than legitimate use. `SIGN_IN_CALLER` is a
 * looser cap per caller so one machine cannot spray many identifiers. The public account flows are
 * capped per caller, and uploads per signed-in account. Every limiter is a guard on top of a control,
 * never the control — it fails open, and the endpoints are bounded by other means as well.
 */
export const RATE_LIMIT = {
  SIGN_IN: { LIMIT: 5, WINDOW_MINUTES: 15 },
  SIGN_IN_CALLER: { LIMIT: 30, WINDOW_MINUTES: 15 },
  REGISTER: { LIMIT: 3, WINDOW_MINUTES: 60 },
  RESEND: { LIMIT: 5, WINDOW_MINUTES: 60 },
  PASSWORD_RESET: { LIMIT: 5, WINDOW_MINUTES: 60 },
  UPLOAD: { LIMIT: 20, WINDOW_MINUTES: 60 },
} as const;

/** A budget: how many, over how long. */
export type RateLimitBudget = { LIMIT: number; WINDOW_MINUTES: number };
