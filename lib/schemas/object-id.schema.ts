import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/**
 * A MongoDB ObjectId as it arrives from a form or a URL — 24 hex characters.
 * Validated at the boundary so a malformed id is a field error rather than a cast exception
 * thrown from inside Mongoose.
 */
export const objectIdField = z.string().trim().regex(OBJECT_ID_PATTERN, 'Invalid identifier.');
