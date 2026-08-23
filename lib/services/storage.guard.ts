import { env } from '@/env/server';

import { STORAGE } from '@/constants/storage.const';

import { createLoggerWithContext } from '@/lib/logger';
import { storage } from '@/lib/storage';

const log = createLoggerWithContext('storage.guard');

/**
 * How full the report bucket is, and what that means for the next upload.
 */
export type StorageStatus = {
  /** Bytes currently held — the real on-disk figure. */
  usedBytes: number;
  /** The ceiling from `STORAGE_CAP_BYTES`. */
  capBytes: number;
  /** `usedBytes / capBytes`, or 0 when the cap is not positive. */
  ratio: number;
  /** Past the warn line: show the banner, still allow the upload. */
  nearFull: boolean;
  /** Past the block line: refuse new uploads. */
  full: boolean;
};

/*
  The last reading, kept for a few seconds so summing every file in the bucket does not run on every
  render of an upload page or every request through the guard. Module-level, so it is per-process
  and correct either way, because it is only a cache in front of an authoritative count.
*/
let cached: { at: number; usedBytes: number } | null = null;

/**
 * The bytes held, from the cache when it is fresh and from the bucket otherwise.
 *
 * Fails **open**: the quota is a guard on top of the per-file cap and the fixed disk, never the only
 * thing between a user and a full database. Refusing every upload because a `$sum` could not be read
 * would turn a database blip into an outage — the worse failure — so on error it reports the last
 * good reading, or zero, and lets the upload try.
 *
 * @returns The measured or last-known used bytes.
 */
async function measureStoredBytes(): Promise<number> {
  const now = Date.now();

  if (cached && now - cached.at < STORAGE.USAGE_CACHE_MS) {
    return cached.usedBytes;
  }

  try {
    const usedBytes = await storage.usage();

    cached = { at: now, usedBytes };

    return usedBytes;
  } catch (error) {
    log.error({ err: error }, 'Measuring stored bytes failed, treating storage as not full');

    return cached?.usedBytes ?? 0;
  }
}

/**
 * Where the bucket stands against its cap. Read by the upload pages to warn or disable before a byte
 * is sent, and by the routes to refuse before a body is read.
 *
 * @returns The current storage status.
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const capBytes = env.STORAGE_CAP_BYTES;
  const usedBytes = await measureStoredBytes();
  const ratio = capBytes > 0 ? usedBytes / capBytes : 0;

  return {
    usedBytes,
    capBytes,
    ratio,
    nearFull: ratio >= STORAGE.WARN_RATIO,
    full: ratio >= STORAGE.BLOCK_RATIO,
  };
}

/**
 * Whether one more file of a known size still fits under the block line — the exact check the coarse
 * "is it already full" gate cannot do, run in the service where the file's size is finally known.
 * The block ratio, not the raw cap, is the ceiling: the same headroom the pre-body gate leaves.
 *
 * @param additionalBytes - The size of the file about to be stored.
 *
 * @returns True when it fits.
 */
export async function hasStorageRoomFor(additionalBytes: number): Promise<boolean> {
  const { usedBytes, capBytes } = await getStorageStatus();

  return usedBytes + additionalBytes <= capBytes * STORAGE.BLOCK_RATIO;
}
