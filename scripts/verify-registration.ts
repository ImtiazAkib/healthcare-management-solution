import mongoose from 'mongoose';

import { Patient, User } from '@/models';

import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { RegistrationService } from '@/lib/services';

/*
  Exercises RegistrationService against a real database, then removes what it made.

  The substance is the rules the screen cannot vouch for: the password is stored **hashed** (never in
  the clear); a verification/reset token is **single-use** (a second click is refused); a
  registration whose email matches a reception record **claims** it rather than minting a second
  patient; and resend / forgot-password are **non-enumerating** — an unknown address gets the same
  silent success a real one does.

  The whole flow is walked against the default `log` mail transport (no server needed). Fixtures
  carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();
const PASSWORD = 'Str0ng-Pass!23';

let failures = 0;
let mrnCounter = Date.now() % 900000;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Patient.createIndexes()]);

  const registration = new RegistrationService();

  try {
    console.log('Register — a fresh patient, password hashed, record and number issued');
    const fresh = await registration.register({ name: 'Ana New', email: email('new'), password: PASSWORD, gender: undefined });
    check('a fresh registration succeeds with a token', fresh.success && Boolean(fresh.result?.verificationToken), fresh.errors);

    const freshAccount = await User.findOne({ email: email('new') }).select('+password +emailVerificationTokenHash');
    check(
      'the account is a patient, unverified but approved',
      freshAccount?.role === USER_ROLES.PATIENT && freshAccount?.isEmailVerified === false && freshAccount?.isApproved === true
    );
    check(
      'the password is stored hashed, never in the clear',
      Boolean(freshAccount?.password) && freshAccount?.password !== PASSWORD && (await freshAccount?.comparePassword(PASSWORD)) === true
    );
    const freshPatient = await Patient.findOne({ user: freshAccount?._id });
    check('a patient record and medical record number were issued', Boolean(freshPatient?.medicalRecordNo));

    console.log('\nVerify — single use');
    const token = fresh.result?.verificationToken ?? '';
    const verified = await registration.verifyEmail(token);
    check('the address verifies from the link', verified.success, verified.errors);
    const verifiedAccount = await User.findOne({ email: email('new') }).select('+emailVerificationTokenHash');
    check(
      'verifying clears the token and marks the address verified',
      verifiedAccount?.isEmailVerified === true && !verifiedAccount?.emailVerificationTokenHash
    );
    const secondClick = await registration.verifyEmail(token);
    check('the same link cannot be used a second time', !secondClick.success, secondClick.errors);

    console.log('\nClaim — a reception record is claimed, not duplicated');
    mrnCounter += 1;
    const receptionEmail = email('reception');
    const receptionAccount = await User.create({
      name: 'Reception Made',
      email: receptionEmail,
      role: USER_ROLES.PATIENT,
      isEmailVerified: false,
      isApproved: true,
      isActive: true,
    });
    const receptionPatient = await Patient.create({ user: receptionAccount._id, medicalRecordNo: `HMS-2099-${String(mrnCounter).padStart(6, '0')}` });

    const claim = await registration.register({ name: 'Reception Made', email: receptionEmail, password: PASSWORD, gender: undefined });
    check('registering a reception email claims the account', claim.success, claim.errors);
    const claimedAccount = await User.findOne({ email: receptionEmail }).select('+password');
    check('the claimed account now has a password', Boolean(claimedAccount?.password) && (await claimedAccount?.comparePassword(PASSWORD)) === true);
    check(
      'no second patient record or number was minted',
      (await Patient.countDocuments({ user: claimedAccount?._id })) === 1 &&
        String((await Patient.findOne({ user: claimedAccount?._id }))?._id) === String(receptionPatient._id)
    );

    const claimAgain = await registration.register({ name: 'Reception Made', email: receptionEmail, password: PASSWORD, gender: undefined });
    check('a claimed account cannot be registered again', !claimAgain.success, claimAgain.errors);

    console.log('\nResend & forgot — non-enumerating');
    const resendUnknown = await registration.reissueVerification(email('nobody'));
    check('resend to an unknown address is a silent success', resendUnknown.success && resendUnknown.result === null);
    const resendVerified = await registration.reissueVerification(email('new'));
    check('resend to an already-verified address is a silent success', resendVerified.success && resendVerified.result === null);
    const forgotUnknown = await registration.issuePasswordReset(email('nobody'));
    check('forgot-password for an unknown address is a silent success', forgotUnknown.success && forgotUnknown.result === null);
    const forgotUnverified = await registration.issuePasswordReset(receptionEmail);
    check('forgot-password for an unverified account is a silent success', forgotUnverified.success && forgotUnverified.result === null);

    console.log('\nReset — a real reset works once');
    const forgot = await registration.issuePasswordReset(email('new'));
    check('a verified account gets a reset token', forgot.success && Boolean(forgot.result?.resetToken), forgot.errors);
    const resetToken = forgot.result?.resetToken ?? '';
    const reset = await registration.resetPassword(resetToken, 'Renewed-Pass!45');
    check('the password resets from the link', reset.success, reset.errors);
    const resetAccount = await User.findOne({ email: email('new') }).select('+password +passwordResetTokenHash');
    check(
      'the new password works and the reset token is cleared',
      (await resetAccount?.comparePassword('Renewed-Pass!45')) === true && !resetAccount?.passwordResetTokenHash
    );
    const resetAgain = await registration.resetPassword(resetToken, 'Third-Pass!67');
    check('the reset link cannot be used a second time', !resetAgain.success, resetAgain.errors);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);

    await Patient.deleteMany({ user: { $in: userIds } });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedUsers.deletedCount} user(s)`);
    check('nothing this run created is left behind', (await User.countDocuments({ email: emailPattern })) === 0);

    await mongoose.disconnect();
  }

  console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

verify().catch(async error => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
