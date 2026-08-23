import mongoose, { Model, Schema } from 'mongoose';

/*
  The counter module is imported directly rather than through the `@/constants` barrel, so nothing
  here can drag `lucide-react` (which the barrel re-exports) into a bundle that has no business with it.
*/
import { RATE_LIMIT_COLLECTION } from '@/constants/rate-limit.const';

/**
 * One rate-limit counter, keyed on `scope:hash`.
 *
 * The **key is hashed**, never the raw identifier or IP — a counter collection in a database dump
 * should not be a list of who has been signing in. The window is computed from `windowStartedAt`
 * rather than inferred from the row existing, and `expiresAt` drives a TTL index so spent rows sweep
 * themselves. The counter lives in the database, not memory, because the deployment target runs many
 * isolates and an in-memory count would be per-isolate — which is no limit at all.
 */
export type RateLimitAttributes = {
  key: string;
  hits: number;
  windowStartedAt: Date;
  expiresAt: Date;
};

export type RateLimitEntity = RateLimitAttributes & { _id: mongoose.Types.ObjectId };

type RateLimitModel = Model<RateLimitAttributes>;

const rateLimitSchema = new Schema<RateLimitAttributes, RateLimitModel>(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 200 },
    hits: { type: Number, required: true, default: 0, min: 0 },
    windowStartedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, collection: RATE_LIMIT_COLLECTION }
);

// Self-cleaning: MongoDB removes a row once `expiresAt` is in the past, so spent windows do not pile up.
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit =
  (mongoose.models.RateLimit as RateLimitModel) ?? mongoose.model<RateLimitAttributes, RateLimitModel>('RateLimit', rateLimitSchema);
