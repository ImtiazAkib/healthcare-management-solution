/**
 * The database every environment connects to.
 *
 * Passed explicitly as `dbName` when connecting rather than being read from the path
 * segment of `MONGODB_URI`. Atlas hands out connection strings without one, and a missing
 * segment silently routes every write to a database called `test` — the app works, the
 * data is in the wrong place, and nothing complains.
 */
export const DATABASE_NAME = 'healthcare-management';
