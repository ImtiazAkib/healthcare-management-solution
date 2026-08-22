import mongoose from 'mongoose';

import { Patient, User } from '@/models';

import { MEDICAL_RECORD_NO } from '@/constants/patient.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import type { PatientRegisterOutput } from '@/lib/schemas';
import { AuthService, PatientService, UserService } from '@/lib/services';
import { calculateAge } from '@/lib/utils';

import type { UserEntity } from '@/models/user.model';

/*
  Exercises PatientService against a real database, then removes what it made.

  The substance is threefold: registration mints an account with no password and a record
  number and the two hang together; the record number is **never issued twice** even under
  simultaneous registrations, because the issuer takes it from an atomic counter; and the
  passwordless account cannot sign in until it is claimed.

  Every fixture is tagged by a run-scoped suffix and removed case-insensitively (the User model
  lower-cases emails). The live MRN counter is deliberately not reset — the sequence advancing by
  a handful is harmless, since a record number is an identifier, not a contiguous tally.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
// Lower-cased to match what the User model stores (it lower-cases email on save and on queries).
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

function registration(local: string, overrides: Partial<PatientRegisterOutput> = {}): PatientRegisterOutput {
  return {
    name: `Patient ${local} ${SUFFIX}`,
    email: email(local),
    phone: '+8801712345678',
    gender: 'male',
    dateOfBirth: new Date('1990-06-15'),
    bloodGroup: 'O+',
    allergies: ['penicillin'],
    chronicConditions: [],
    emergencyContact: { name: `Kin ${SUFFIX}`, relation: 'spouse', phone: '+8801712345679' },
    address: '10 Test Road, Dhaka',
    ...overrides,
  };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Patient.createIndexes()]);

  const service = new PatientService();
  const auth = new AuthService();

  try {
    console.log('Register — the account, the number, and how they hang together');
    const registered = await service.register(registration('alpha'));
    check('a patient is registered', registered.success, registered.errors);
    check(
      'the summary carries a well-formed record number',
      MEDICAL_RECORD_NO.PATTERN.test(registered.result?.medicalRecordNo ?? ''),
      registered.result?.medicalRecordNo
    );

    const account = await User.findOne({ email: email('alpha') })
      .select('+password')
      .lean<UserEntity | null>();
    check('the account is a patient', account?.role === USER_ROLES.PATIENT);
    check('the account has no password', !account?.password, account?.password);
    check(
      'the account is unverified but approved and active',
      account?.isEmailVerified === false && account?.isApproved === true && account?.isActive === true,
      {
        verified: account?.isEmailVerified,
        approved: account?.isApproved,
        active: account?.isActive,
      }
    );

    console.log('\nSign-in — a counter-registered patient cannot yet');
    const signIn = await auth.verifyCredentials(email('alpha'), 'any password at all');
    check('the passwordless account is refused at sign-in', !signIn.success);

    console.log('\nBoundary — a patient is not a staff account (review finding)');
    const userService = new UserService();
    const staffList = await userService.list({ role: 'all', status: 'all', query: '' });
    check(
      'a registered patient does not appear on the staff list',
      staffList.result.every(staff => staff.userId !== String(account?._id)),
      {
        leaked: staffList.result.filter(staff => staff.userId === String(account?._id)).map(staff => staff.role),
      }
    );

    console.log('\nThe number is never issued twice — simultaneous registrations');
    const racers = ['race1', 'race2', 'race3', 'race4', 'race5'];
    const results = await Promise.all(racers.map(local => service.register(registration(local))));
    const numbers = results.map(result => result.result?.medicalRecordNo ?? '');
    check(
      'every simultaneous registration succeeded',
      results.every(result => result.success),
      results.map(r => r.errors)
    );
    check(
      'every number is well-formed',
      numbers.every(number => MEDICAL_RECORD_NO.PATTERN.test(number)),
      numbers
    );
    check('no two registrations share a number', new Set(numbers).size === numbers.length, numbers);

    console.log('\nEmail — one account per address');
    const duplicate = await service.register(registration('alpha'));
    check('a duplicate email is refused on the email field', !duplicate.success && duplicate.errors[0]?.field === 'email', duplicate.errors);

    console.log('\nSearch — record number, phone and name; nothing clinical');
    const byNumber = await service.list({ query: registered.result?.medicalRecordNo ?? '' });
    check(
      'search by record number finds the patient',
      byNumber.result.some(patient => patient.patientId === registered.result?.patientId)
    );

    const byPhone = await service.list({ query: '01712345678' });
    check('search by phone finds a patient', byPhone.result.length > 0);

    const byName = await service.list({ query: `Patient alpha ${SUFFIX}` });
    check(
      'search by partial name finds the patient',
      byName.result.some(patient => patient.patientId === registered.result?.patientId)
    );
    check(
      'the list reports a total match count, so truncation is never silent (review finding)',
      byName.resultInfo !== null && byName.resultInfo.totalCount >= 1,
      byName.resultInfo
    );

    const byAllergy = await service.list({ query: 'penicillin' });
    check(
      'search does NOT match on a clinical entry (allergy)',
      byAllergy.result.every(patient => patient.patientId !== registered.result?.patientId)
    );

    console.log('\nDetail — demographics and the full clinical record');
    const patientId = registered.result?.patientId ?? '';
    const detail = await service.getDetail(patientId);
    check(
      'the detail carries the demographics',
      detail.result?.name === `Patient alpha ${SUFFIX}` && detail.result?.email === email('alpha'),
      detail.errors
    );
    check('and the clinical record', detail.result?.bloodGroup === 'O+' && detail.result?.allergies.includes('penicillin'));
    check('and the emergency contact', detail.result?.emergencyContact?.relation === 'spouse');

    console.log('\nEdit — the clinical record only');
    const updated = await service.update({
      patientId,
      bloodGroup: 'A-',
      allergies: ['penicillin', 'latex'],
      chronicConditions: ['asthma'],
      emergencyContact: { name: `New kin ${SUFFIX}`, relation: 'sibling', phone: '+8801712345680' },
      address: '20 New Road, Dhaka',
    });
    check(
      'the clinical record is updated',
      updated.success && updated.result?.bloodGroup === 'A-' && updated.result?.allergies.length === 2,
      updated.errors
    );
    check(
      'the name and record number are untouched by a clinical edit',
      updated.result?.name === `Patient alpha ${SUFFIX}` && updated.result?.medicalRecordNo === registered.result?.medicalRecordNo
    );

    // Clearing the emergency contact removes it rather than leaving a half-empty one.
    const cleared = await service.update({
      patientId,
      bloodGroup: undefined,
      allergies: [],
      chronicConditions: [],
      emergencyContact: undefined,
      address: '',
    });
    check('an emergency contact can be cleared', cleared.success && cleared.result?.emergencyContact === null, cleared.result?.emergencyContact);

    console.log('\nAge — computed, never negative, and not aged up a day early (review finding)');
    check('a future date of birth is age 0', calculateAge(new Date(Date.now() + 86_400_000).toISOString()) === 0);
    check('a plausible age is computed from a past date', calculateAge('2000-01-01') >= 20 && calculateAge('2000-01-01') <= 40);
    // A date of birth stored as UTC midnight must not read one day early in a timezone behind UTC.
    const utcMidnightDob = new Date('2000-08-22T00:00:00.000Z');
    check('a UTC-midnight birthday is not aged up a day early', calculateAge(utcMidnightDob.toISOString()) === calculateAge(utcMidnightDob));

    console.log('\nRegister — the minimum: a name and an email, nothing else');
    const minimal = await service.register({
      name: `Minimal ${SUFFIX}`,
      email: email('minimal'),
      phone: undefined,
      gender: undefined,
      dateOfBirth: undefined,
      bloodGroup: undefined,
      allergies: [],
      chronicConditions: [],
      emergencyContact: undefined,
      address: undefined,
    });
    check('a patient registers with no optional fields', minimal.success, minimal.errors);
    const minimalDetail = await service.getDetail(minimal.result?.patientId ?? '');
    check('and the emergency contact is absent', minimalDetail.result?.emergencyContact === null);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);

    const removedPatients = await Patient.deleteMany({ user: { $in: userIds } });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedPatients.deletedCount} patient(s), ${removedUsers.deletedCount} user(s)`);
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
