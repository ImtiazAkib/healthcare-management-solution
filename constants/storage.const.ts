/**
 * File storage policy — the bucket, the per-file ceiling, and the quota thresholds.
 *
 * The per-deployment total lives in `env.STORAGE_CAP_BYTES`, not here, because it differs
 * per deployment the way `MONGODB_URI` does; these are the fixed policy numbers that do not.
 */
export const STORAGE = {
  /** The GridFS bucket diagnostic report files are stored in. */
  BUCKET: 'lab-reports',
  /*
    The largest a single report file may be. A diagnostic PDF or image is small; this is a
    guard against an accidental or hostile upload, checked twice — coarsely from the request's
    declared length before a byte is buffered, and exactly against the file's real size once it
    has arrived.
  */
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024,
  /** Past this fraction of the cap, warn but still accept. */
  WARN_RATIO: 0.85,
  /** Past this fraction of the cap, refuse new uploads — the headroom left is deliberate. */
  BLOCK_RATIO: 0.95,
  /** How long a bucket-size measurement is reused before it is taken again. */
  USAGE_CACHE_MS: 5000,
} as const;
