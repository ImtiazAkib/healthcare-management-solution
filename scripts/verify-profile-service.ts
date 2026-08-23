import mongoose from 'mongoose';

import { Patient, User } from '@/models';
import { SessionUser } from '@/types';

import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { ProfileContactSchema, ProfileUpdateSchema } from '@/lib/schemas';
import { ProfileService } from '@/lib/services';

import type { UserEntity } from '@/models/user.model';

/*
  Exercises ProfileService against a real database, then removes what it made.

  The substance is the rules the screen cannot vouch for: an email change is **held pending** — the
  address in force and the session keep the old value until the link is followed, and the link works
  **once**; a change onto a **taken** address is refused; a password change needs the **current**
  password and stores the new one **hashed**; the update schema **has no** role/approval/record-number
  fields, so a hand-built request naming them is stripped; and the emergency-contact edit reaches a
  patient's contact and address but **not** their clinical fields, and refuses on a staff account.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
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

function sessionOf(account: UserEntity): SessionUser {
  return { userId: String(account._id), role: account.role, email: account.email, name: account.name, isApproved: account.isApproved };
}

async function seedPatient(local: string, name: string): Promise<UserEntity> {
  mrnCounter += 1;
  const account = await User.create({
    name,
    email: email(local),
    password: PASSWORD,
    role: USER_ROLES.PATIENT,
    isEmailVerified: true,
    isApproved: true,
    isActive: true,
  });
  await Patient.create({ user: account._id, medicalRecordNo: `HMS-2098-${String(mrnCounter).padStart(6, '0')}` });

  return account.toObject();
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Patient.createIndexes()]);

  const profile = new ProfileService();

  try {
    const patient = await seedPatient('patient', 'Pat Original');
    const session = sessionOf(patient);

    console.log('Edit — name and demographics write straight through, and the session carries the new name');
    const edit = await profile.updateProfile(
      ProfileUpdateSchema.parse({ name: 'Pat Renamed', email: patient.email, phone: '01712345678', gender: 'male', dateOfBirth: '1990-05-15' }),
      session
    );
    check('the edit succeeds', edit.success, edit.errors);
    check('no email change means no pending token', edit.result?.pendingEmailToken === null);
    check(
      'the re-issue session carries the new name and the old address',
      edit.result?.session.name === 'Pat Renamed' && edit.result?.session.email === patient.email
    );
    const afterEdit = await User.findById(patient._id).lean<UserEntity | null>();
    // The phone is stored in its canonical `+8801…` form, not the `017…` a person types.
    check(
      'the new name, phone and gender are stored',
      afterEdit?.name === 'Pat Renamed' && afterEdit?.phone === '+8801712345678' && afterEdit?.gender === 'male'
    );

    console.log('\nEmail change — held pending, old address still in force');
    const requested = await profile.updateProfile(ProfileUpdateSchema.parse({ name: 'Pat Renamed', email: email('moved') }), session);
    check('the request succeeds and returns a token', requested.success && Boolean(requested.result?.pendingEmailToken), requested.errors);
    check('the re-issue session still carries the OLD address', requested.result?.session.email === patient.email);
    const pendingAccount = await User.findById(patient._id).select('+pendingEmail +pendingEmailTokenHash').lean<UserEntity | null>();
    check('the address in force is unchanged', pendingAccount?.email === patient.email);
    check(
      'the new address is held pending with a hashed token',
      pendingAccount?.pendingEmail === email('moved') && Boolean(pendingAccount?.pendingEmailTokenHash)
    );

    console.log('\nConfirm — the link works once and moves the address');
    const changeToken = requested.result?.pendingEmailToken ?? '';
    const confirmed = await profile.confirmEmailChange(changeToken);
    check('confirming succeeds and reports the new address', confirmed.success && confirmed.result?.email === email('moved'), confirmed.errors);
    const movedAccount = await User.findById(patient._id).select('+pendingEmail +pendingEmailTokenHash').lean<UserEntity | null>();
    check(
      'the address in force is now the new one and the pending fields are cleared',
      movedAccount?.email === email('moved') && !movedAccount?.pendingEmail && !movedAccount?.pendingEmailTokenHash
    );
    const confirmAgain = await profile.confirmEmailChange(changeToken);
    check('the same link cannot be used a second time', !confirmAgain.success, confirmAgain.errors);

    console.log('\nEmail change — onto a taken address, refused with nothing left pending');
    const other = await seedPatient('other', 'Someone Else');
    const collision = await profile.updateProfile(ProfileUpdateSchema.parse({ name: 'Pat Renamed', email: other.email }), {
      ...session,
      email: email('moved'),
    });
    check('a change onto a taken address is refused', !collision.success, collision.errors);
    const noPending = await User.findById(patient._id).select('+pendingEmail').lean<UserEntity | null>();
    check('nothing was left pending by the refused change', !noPending?.pendingEmail);

    console.log('\nPassword — current required, new one stored hashed');
    const wrongCurrent = await profile.changePassword(
      { currentPassword: 'not-the-password', newPassword: 'Renewed-Pass!45', confirmPassword: 'Renewed-Pass!45' },
      session
    );
    check('a wrong current password is refused', !wrongCurrent.success, wrongCurrent.errors);
    const changed = await profile.changePassword(
      { currentPassword: PASSWORD, newPassword: 'Renewed-Pass!45', confirmPassword: 'Renewed-Pass!45' },
      session
    );
    check('the password changes with the correct current one', changed.success, changed.errors);
    const rehashed = await User.findById(patient._id).select('+password');
    check(
      'the new password works and is stored hashed',
      rehashed?.password !== 'Renewed-Pass!45' && (await rehashed?.comparePassword('Renewed-Pass!45')) === true
    );

    console.log('\nBlocked by absence — the update schema has no privileged fields');
    const parsed = ProfileUpdateSchema.parse({
      name: 'Pat Renamed',
      email: email('moved'),
      role: 'admin',
      isApproved: true,
      userId: '507f1f77bcf86cd799439011',
      medicalRecordNo: 'HMS-2000-000001',
    });
    check(
      'role, approval, id and record number are stripped, not saved',
      !('role' in parsed) && !('isApproved' in parsed) && !('userId' in parsed) && !('medicalRecordNo' in parsed)
    );

    console.log('\nContact — a patient edits their own contact and address, not the clinical record');
    const contact = await profile.updateContact(
      ProfileContactSchema.parse({
        emergencyName: 'Kin Person',
        emergencyRelation: 'Sibling',
        emergencyPhone: '01812345678',
        address: '12 Test Road',
      }),
      session
    );
    check(
      'the contact and address save',
      contact.success && contact.result?.emergencyContact?.name === 'Kin Person' && contact.result?.address === '12 Test Road',
      contact.errors
    );
    const contactPatient = await Patient.findOne({ user: patient._id }).lean();
    check('the clinical fields were left untouched', Array.isArray(contactPatient?.allergies) && contactPatient?.allergies.length === 0);

    const partial = ProfileContactSchema.safeParse({ emergencyName: 'Only A Name' });
    check('a partial emergency contact is refused', !partial.success);

    console.log('\nContact — a staff account has no patient record to edit');
    const nurse = await User.create({
      name: 'Nora Nurse',
      email: email('nurse'),
      password: PASSWORD,
      role: USER_ROLES.NURSE,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const staffContact = await profile.updateContact(ProfileContactSchema.parse({ address: 'Nowhere' }), sessionOf(nurse.toObject()));
    check('editing a staff contact is refused — no patient record', !staffContact.success, staffContact.errors);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ $or: [{ email: emailPattern }, { pendingEmail: emailPattern }] })
      .select('_id')
      .lean();
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
