/**
 * The facility's timezone. Every date the app renders is formatted in it, so an
 * appointment at 09:30 reads 09:30 regardless of where the server runs or where the
 * visitor is.
 *
 * One facility, one timezone — that is the scope decision, not an oversight. It is read
 * from here in exactly one place per formatter, so a different facility is a one-line
 * change rather than a search for hardcoded offsets.
 */
export const DEFAULT_TIMEZONE = 'Asia/Dhaka';
