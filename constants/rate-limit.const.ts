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
