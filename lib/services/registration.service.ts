import { randomBytes } from 'node:crypto';

import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { UserDto, userFromEntity } from '@/types';

import { EMAIL_VERIFICATION } from '@/constants/account.const';
import { CODES } from '@/constants/codes.const';
import { USER_ROLES } from '@/constants/roles.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { SingleResult, createError, singleFailure, singleSuccess } from '@/lib/result';
import type { PatientRegistrationOutput } from '@/lib/schemas';

import { issueMedicalRecordNo } from './record-number.issuer';
import { hashToken } from './token.hash';

const log = createLoggerWithContext('registration.service');

const DATABASE = CODES.DATABASE.REGISTRATION;
const VALIDATION = CODES.VALIDATION.REGISTRATION;
const USERS = CODES.VALIDATION.USERS;

const LIFETIME_MS = EMAIL_VERIFICATION.LIFETIME_HOURS * 60 * 60 * 1000;
const COOLDOWN_MS = EMAIL_VERIFICATION.RESEND_COOLDOWN_MINUTES * 60 * 1000;

/** A registration or a claim: the account, and the raw token the caller mails as a link. */
export type Registration = { user: UserDto; verificationToken: string };

/** A reissued verification: the account, and the fresh raw token. */
export type Reissue = { user: UserDto; verificationToken: string };

/** A password-reset request: the account, and the raw reset token. */
export type PasswordReset = { user: UserDto; resetToken: string };

/** A mongo duplicate-key error — the unique email index refusing a second account under a race. */
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
}

/*
  Self-registration, email verification, and password reset.

  Three rules carry the weight:

  - **The password is never stored in the clear.** Every write goes through a hydrated document and
    `save()`, so the model's pre-save hook hashes it — a `findByIdAndUpdate` would skip that hook and
    write a plaintext password, so it is never used for a password.
  - **A token is single-use and short-lived, stored hashed.** The raw token lives only in the link;
    the database holds its hash. A token is looked up by hash, checked against its expiry, and cleared
    the moment it is used.
  - **A registration whose email matches a record reception already created claims that record** —
    the same account and its existing medical record number — rather than minting a second patient.
    Duplicate records are the classic failure of this workflow, and the record number is what makes
    claiming possible.

  Resend and forgot-password are **non-enumerating**: an unknown address, an already-verified account
  and one inside its cooldown all get the same silent success, so the screen cannot be used to learn
  whether an address belongs to a patient.
*/
export class RegistrationService {
  /**
   * Register a patient — or claim the record reception already created for this email.
   *
   * @param input - Validated registration input.
   *
   * @returns The account and the raw verification token to mail, or a failure.
   */
  public async register(input: PatientRegistrationOutput): Promise<SingleResult<Registration>> {
    try {
      await connectToDatabase();

      const email = input.email.toLowerCase().trim();
      const token = randomBytes(EMAIL_VERIFICATION.TOKEN_BYTES).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + LIFETIME_MS);

      const existing = await User.findOne({ email }).select('+password');

      if (existing) {
        // Claimable only if it is an unclaimed, unverified reception-created patient record.
        const isClaimable = existing.role === USER_ROLES.PATIENT && !existing.password && !existing.isEmailVerified;

        if (!isClaimable) {
          return singleFailure(createError(USERS.EMAIL_ALREADY_USED.CODE, USERS.EMAIL_ALREADY_USED.MESSAGE, 'email'));
        }

        // Claim it: attach a password and a fresh token to the existing row and its medical record
        // number. The record's own name and demographics — what reception entered — are left as they are.
        existing.password = input.password;
        existing.emailVerificationTokenHash = tokenHash;
        existing.emailVerificationExpiresAt = expiresAt;
        await existing.save();

        return singleSuccess({ user: userFromEntity(existing), verificationToken: token });
      }

      // A fresh registration: create the account (approved, unverified, no session yet) and its record.
      const account = await User.create({
        name: input.name,
        email,
        password: input.password,
        role: USER_ROLES.PATIENT,
        isEmailVerified: false,
        isApproved: true,
        isActive: true,
        phone: input.phone || undefined,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      });

      try {
        const medicalRecordNo = await issueMedicalRecordNo();
        await Patient.create({ user: account._id, medicalRecordNo });
      } catch (recordError) {
        // Compensate for the account that was made but never completed into a patient record.
        await User.findByIdAndDelete(account._id);
        throw recordError;
      }

      return singleSuccess({ user: userFromEntity(account), verificationToken: token });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return singleFailure(createError(USERS.EMAIL_ALREADY_USED.CODE, USERS.EMAIL_ALREADY_USED.MESSAGE, 'email'));
      }

      log.error({ err: error }, 'Registering a patient failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Verify an address from a link. Single-use: the token is cleared as the address is confirmed.
   *
   * @param token - The raw token from the link.
   *
   * @returns The verified account, or an invalid/expired-link failure.
   */
  public async verifyEmail(token: string): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const user = await User.findOne({ emailVerificationTokenHash: hashToken(token) }).select(
        '+emailVerificationTokenHash +emailVerificationExpiresAt'
      );

      if (!user) {
        return singleFailure(createError(VALIDATION.VERIFICATION_LINK_INVALID.CODE, VALIDATION.VERIFICATION_LINK_INVALID.MESSAGE));
      }

      if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) {
        return singleFailure(createError(VALIDATION.VERIFICATION_LINK_EXPIRED.CODE, VALIDATION.VERIFICATION_LINK_EXPIRED.MESSAGE));
      }

      user.isEmailVerified = true;
      user.emailVerificationTokenHash = undefined;
      user.emailVerificationExpiresAt = undefined;
      await user.save();

      return singleSuccess(userFromEntity(user));
    } catch (error) {
      log.error({ err: error }, 'Verifying an email failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Reissue a verification link. Non-enumerating: every case that is not "registered and unverified
   * and past its cooldown" returns a silent success carrying no token.
   *
   * @param email - The address to resend to.
   *
   * @returns The account and a fresh token when one was issued, or a null success.
   */
  public async reissueVerification(email: string): Promise<SingleResult<Reissue | null>> {
    try {
      await connectToDatabase();

      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+emailVerificationExpiresAt');

      if (!user || user.isEmailVerified || !user.isActive || this.withinCooldown(user.emailVerificationExpiresAt)) {
        return singleSuccess(null);
      }

      const token = randomBytes(EMAIL_VERIFICATION.TOKEN_BYTES).toString('hex');
      user.emailVerificationTokenHash = hashToken(token);
      user.emailVerificationExpiresAt = new Date(Date.now() + LIFETIME_MS);
      await user.save();

      return singleSuccess({ user: userFromEntity(user), verificationToken: token });
    } catch (error) {
      log.error({ err: error }, 'Reissuing a verification failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Issue a password-reset link. Only for a verified, active account; non-enumerating for every other
   * case, including an unknown address.
   *
   * @param email - The address that asked.
   *
   * @returns The account and a reset token when one was issued, or a null success.
   */
  public async issuePasswordReset(email: string): Promise<SingleResult<PasswordReset | null>> {
    try {
      await connectToDatabase();

      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordResetExpiresAt');

      if (!user || !user.isEmailVerified || !user.isActive || this.withinCooldown(user.passwordResetExpiresAt)) {
        return singleSuccess(null);
      }

      const token = randomBytes(EMAIL_VERIFICATION.TOKEN_BYTES).toString('hex');
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + LIFETIME_MS);
      await user.save();

      return singleSuccess({ user: userFromEntity(user), resetToken: token });
    } catch (error) {
      log.error({ err: error }, 'Issuing a password reset failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Set a new password from a reset link. Single-use: the token is cleared and the model hashes the
   * new password on save.
   *
   * @param token - The raw reset token.
   * @param newPassword - The new password.
   *
   * @returns The account, or an invalid/expired-link failure.
   */
  public async resetPassword(token: string, newPassword: string): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const user = await User.findOne({ passwordResetTokenHash: hashToken(token) }).select(
        '+passwordResetTokenHash +passwordResetExpiresAt +password'
      );

      if (!user) {
        return singleFailure(createError(VALIDATION.VERIFICATION_LINK_INVALID.CODE, VALIDATION.VERIFICATION_LINK_INVALID.MESSAGE));
      }

      if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
        return singleFailure(createError(VALIDATION.VERIFICATION_LINK_EXPIRED.CODE, VALIDATION.VERIFICATION_LINK_EXPIRED.MESSAGE));
      }

      user.password = newPassword;
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();

      return singleSuccess(userFromEntity(user));
    } catch (error) {
      log.error({ err: error }, 'Resetting a password failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Whether a token issued at (expiry minus its lifetime) is still inside the resend cooldown — so a
   * resend button cannot be a mail cannon. Derived from the row's own expiry, so it needs no separate
   * timestamp.
   *
   * @param expiresAt - The token's current expiry, or undefined when none is set.
   *
   * @returns True when a new token should not yet be issued.
   */
  private withinCooldown(expiresAt: Date | undefined): boolean {
    if (!expiresAt) {
      return false;
    }

    const issuedAt = expiresAt.getTime() - LIFETIME_MS;

    return Date.now() - issuedAt < COOLDOWN_MS;
  }
}
