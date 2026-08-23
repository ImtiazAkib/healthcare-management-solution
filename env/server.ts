import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/*
  Server-side environment. Imported at the top of `next.config.ts`, so an invalid or missing
  variable fails the build instead of surfacing as a runtime error on some request nobody
  made yet.

  Both `MONGODB_URI` and `AUTH_SECRET` are required now: the data model reads one and
  authentication signs with the other. A clean clone needs a reachable database and a secret
  before it will build.
*/

/*
  For a variable that has a default, an unset one and one that is present but empty mean the
  same thing: use the default.

  This is not a nicety. Somebody who blanks a line in `.env.local` rather than deleting it
  hands zod an empty string, and `.default()` only applies to `undefined` — so `z.url()`
  would refuse `''` and the build would fail on a variable that has a perfectly good default
  sitting right there.

  It is applied only to the defaulted variables. A blank `MONGODB_URI` or `AUTH_SECRET`
  **should** fail: those have no safe default, and quietly reading a blank as absent would
  turn a missing secret into a confusing error somewhere further down.

  @param schema - The schema to apply once a real value is present.

  @returns The same schema, with an empty string read as absence.
*/
function blankAsAbsent<T extends z.ZodType>(schema: T) {
  return z.preprocess(value => (value === '' ? undefined : value), schema);
}

export const env = createEnv({
  server: {
    // Logging
    LOG_LEVEL: blankAsAbsent(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')),

    // App
    APP_BASE_URL: blankAsAbsent(z.url().default('http://localhost:3000')),

    /*
      Indexing switch. Defaults to off so a staging deploy cannot be indexed by forgetting a
      variable — production has to turn it on deliberately.
    */
    ROBOTS_ENABLED: blankAsAbsent(
      z
        .enum(['true', 'false'])
        .default('false')
        .transform(value => value === 'true')
    ),

    /*
      Required from here on: the data model landed, and every service reads it. The database
      name is NOT taken from this string — `lib/mongodb.ts` passes it explicitly, so an
      Atlas URI copied without its path segment cannot silently write to a database called
      `test`.
    */
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    /*
      Signs the session token. Required — a missing or short secret means a session can be
      forged, so it fails the build rather than degrading quietly. Generate one with
      `openssl rand -base64 32`.
    */
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),

    /*
      The total the diagnostic-report bucket may hold. Defaulted, because it differs per
      deployment the way the database does — a generous ceiling for a clone, tuned per
      environment. The per-file cap and the quota guard are measured against this.
    */
    STORAGE_CAP_BYTES: blankAsAbsent(
      z.coerce
        .number()
        .int()
        .positive()
        .default(1024 * 1024 * 1024)
    ),
  },
  experimental__runtimeEnv: process.env,
});
