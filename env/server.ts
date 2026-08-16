import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/*
  Server-side environment. Imported at the top of `next.config.ts`, so an invalid or missing
  variable fails the build instead of surfacing as a runtime error on some request nobody
  made yet.

  `AUTH_SECRET` is still optional: nothing signs a session until authentication lands in
  step 4, and it becomes required there. `MONGODB_URI` became required with the data model —
  a clean clone now needs a reachable database before it will build.
*/

/*
  An unset variable and one that is present but empty mean the same thing.

  This is not a nicety. `.env.example` ships the optional keys blank, so copying it — the
  documented first step — hands every one of them an empty string. Without this, `min(1)`
  refuses all of them, and once `proxy.ts` imports this module in step 4 the failure lands
  in the middleware: every route in the application returns a 500, on a clean clone, before
  anybody has typed anything wrong.

  @param schema - The schema to apply once a real value is present.

  @returns The same schema, with an empty string read as absence.
*/
function blankAsAbsent<T extends z.ZodType>(schema: T) {
  return z.preprocess(value => (value === '' ? undefined : value), schema);
}

/** An optional string that tolerates the blank line `.env.example` ships. */
const optionalText = blankAsAbsent(z.string().min(1).optional());

export const env = createEnv({
  server: {
    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // App
    APP_BASE_URL: z.url().default('http://localhost:3000'),

    /*
      Indexing switch. Defaults to off so a staging deploy cannot be indexed by forgetting a
      variable — production has to turn it on deliberately.
    */
    ROBOTS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform(value => value === 'true'),

    /*
      Required from here on: the data model landed, and every service reads it. The database
      name is NOT taken from this string — `lib/mongodb.ts` passes it explicitly, so an
      Atlas URI copied without its path segment cannot silently write to a database called
      `test`.
    */
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    /*
      Signs the session token from step 4. Becomes `min(32)` and required there — a missing
      or short secret means a session can be forged, so it will fail the build rather than
      degrade quietly.
    */
    AUTH_SECRET: optionalText,
  },
  experimental__runtimeEnv: process.env,
});
