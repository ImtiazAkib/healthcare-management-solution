import bcrypt from 'bcryptjs';
import mongoose, { Model, Schema, Types } from 'mongoose';

import { Gender, UserRole } from '@/types';

/*
  Models import the constant module directly rather than the `@/constants` barrel. The
  barrel re-exports `home.const.ts`, which pulls in `lucide-react` — fine in a React tree,
  dead weight in a seed script and fatal in a middleware bundle.
*/
import { ABSENT_PASSWORD_HASH } from '@/constants/auth.const';
import { USER_ROLES } from '@/constants/roles.const';
import { ACCOUNT_FIELD_LIMITS, GENDERS } from '@/constants/users.const';

const PASSWORD_SALT_ROUNDS = 12;

/**
 * An account: who somebody is, and what they may do.
 *
 * **Nothing clinical lives here.** A patient's allergies, conditions and blood group sit on
 * the `Patient` document instead. This one is read on every sign-in and is what the session
 * token is minted from, and health information has no business in either.
 */
export type UserAttributes = {
  name: string;
  email: string;
  /**
   * Holds the bcrypt hash at rest. `select: false`, so it is absent unless a query asks for
   * it explicitly with `.select('+password')`.
   *
   * Optional, because reception registers a patient at the counter before that patient has
   * an account they can open: the record exists and staff can use it, and the person claims
   * it later by proving the address. That is the normal case in a hospital, not an edge one.
   */
  password?: string;
  role: UserRole;
  /**
   * Whether the address has been proven. An account signs in only when this and
   * `isApproved` are both true, and they are different problems with different remedies —
   * "check your inbox" is not "wait for the hospital".
   */
  isEmailVerified: boolean;
  isApproved: boolean;
  isActive: boolean;
  phone?: string;
  gender?: Gender;
  /**
   * Clinical rather than demographic: it is what an age is computed from, and age decides
   * which reference range a vitals reading is judged against.
   */
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A stored user as the rest of the app sees it. Structural rather than a Mongoose
 * `HydratedDocument`, so DTO mappers accept both hydrated documents and `.lean()` results
 * without knowing which they were given.
 */
export type UserEntity = UserAttributes & { _id: Types.ObjectId };

type UserMethods = {
  comparePassword(candidate: string): Promise<boolean>;
};

type UserModel = Model<UserAttributes, object, UserMethods>;

const userSchema = new Schema<UserAttributes, UserModel, UserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: ACCOUNT_FIELD_LIMITS.NAME },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: ACCOUNT_FIELD_LIMITS.EMAIL },
    // Absent on a counter-registered patient until they claim the account — see the attribute.
    password: { type: String, select: false },
    role: { type: String, required: true, enum: Object.values(USER_ROLES) },
    // A staff account is created by an administrator and trusted; a patient proves the address.
    isEmailVerified: { type: Boolean, required: true, default: false },
    isApproved: { type: Boolean, required: true, default: false },
    // Deactivate rather than delete, so an encounter keeps a valid author forever.
    isActive: { type: Boolean, required: true, default: true },
    phone: { type: String, trim: true, maxlength: ACCOUNT_FIELD_LIMITS.PHONE },
    gender: { type: String, enum: Object.values(GENDERS) },
    dateOfBirth: { type: Date },
  },
  { timestamps: true }
);

/*
  Hashing lives here, not in an action or a route handler. Any code path that saves a user
  gets it — including the seed script — and no caller can forget.
*/
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
});

/*
  Refuses when the account has no password at all — a counter-registered patient who has not
  claimed it — but refuses **after doing the same work**, by comparing against a hash of a
  value nothing will ever submit.

  Returning false immediately would be correct and would leak: bcrypt at cost 12 is roughly
  200ms, so a caller with a stopwatch could tell an unclaimed account from a wrong password
  even though both answer with the same code and the same sentence. See the note on
  `ABSENT_PASSWORD_HASH`.
*/
userSchema.method('comparePassword', async function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password ?? ABSENT_PASSWORD_HASH);
});

/*
  There is exactly one super administrator, and this is what makes that true rather than
  merely intended. A partial unique index applies the constraint only to rows carrying that
  role, so every other account is untouched — but a second super administrator cannot be
  written by a service, a seed script, or somebody at a Mongo shell. A check in a service is
  a rule the next caller can forget; an index is not.
*/
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: USER_ROLES.SUPER_ADMIN } });

// Guarded so hot reload re-uses the compiled model instead of redefining it.
export const User = (mongoose.models.User as UserModel) ?? mongoose.model<UserAttributes, UserModel>('User', userSchema);
