/*
  A session lasts at most one hour. Paired with the live re-validation in `getSessionUser`,
  this bounds two things: a stolen token is useless an hour after it was minted, and a
  deactivation, de-approval or role change that the database re-check somehow misses cannot
  outlive the hour either. It is an absolute cap, not a sliding idle timeout, so no active
  session survives past the hour without signing in again.

  An hour rather than the week a general-purpose app would take, because the sessions here
  are opened on shared machines at a nurses' station and a reception desk.
*/
const ONE_HOUR_IN_SECONDS = 60 * 60;

export const SESSION = {
  COOKIE: {
    NAME: 'caresync.session',
    MAX_AGE: ONE_HOUR_IN_SECONDS,
  },
  /*
    Pinned into the token and checked on the way back. They cost nothing and mean a token
    minted for some other service can never be replayed here.
  */
  ISSUER: 'caresync',
  AUDIENCE: 'caresync',
  /**
   * The only algorithm accepted on verification. Naming it explicitly is what blocks an
   * algorithm-confusion attack, where a token arrives claiming `alg: none`.
   */
  ALGORITHM: 'HS256',
} as const;

/**
 * A real bcrypt hash, at the same cost as a stored password, of a value nothing will ever
 * submit. It exists to be compared against and to fail.
 *
 * **This is a timing defense, not a secret.** Returning early when there is no account — or
 * when an account has no password yet — makes the refusal arrive in under a millisecond,
 * while a real wrong password costs the ~200ms that bcrypt at cost 12 takes. The shared
 * `INVALID_CREDENTIALS` code and its shared sentence are only half of not disclosing whether
 * an address is registered; spending the same time on both answers is the other half. In a
 * hospital, "does this address have an account" is "is this person a patient here".
 *
 * Regenerate it, if it ever needs regenerating, with any value that is not a real password:
 * `bcrypt.hashSync('caresync/absent-password/do-not-use', 12)`.
 */
export const ABSENT_PASSWORD_HASH = '$2b$12$B.sKuwjGarFidST7XwKs..V8iMJRZTeA2QB9sV3/QhZYFQcY9ra4a';
