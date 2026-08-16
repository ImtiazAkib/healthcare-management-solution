import mongoose from 'mongoose';

import { Department, Doctor, Patient, User } from '@/models';
import { departmentFromEntity, doctorFromEntity, patientFromEntity, patientSummaryFromEntities, userFromEntity } from '@/types';

import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { DoctorCreateSchema, PatientCreateSchema, UserCreateSchema, UserUpdateSchema } from '@/lib/schemas';

/*
  Exercises the identity and directory models against a real database, then removes
  everything it made.

  Every fixture is tagged with a run-scoped suffix so two runs — or a run against a database
  somebody is using — cannot collide, and the cleanup in `finally` deletes by that tag
  rather than by emptying collections. A verification script that can drop real records is
  not a verification script.
*/
const TAG = `verify-${Date.now().toString(36)}`;
const email = (local: string) => `${local}.${TAG}@example.test`;

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

/**
 * Run a write that is expected to be refused, and report what refused it.
 *
 * @param operation - The write to attempt.
 *
 * @returns The error message, or null if the write unexpectedly succeeded.
 */
async function refusalFrom(operation: () => Promise<unknown>): Promise<string | null> {
  try {
    await operation();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  /*
    Indexes are built in the background by default, so a uniqueness assertion made
    immediately after the first insert can pass for the wrong reason. Build them first and
    wait. `createIndexes` rather than `syncIndexes` — the latter drops indexes it does not
    recognize, which is not a thing a verification script should do to a live database.
  */
  await Promise.all([User.createIndexes(), Department.createIndexes(), Doctor.createIndexes(), Patient.createIndexes()]);

  try {
    console.log('User — password handling');
    const plaintext = 'correct horse battery';
    const staff = await User.create({ name: 'Verify Staff', email: email('staff'), password: plaintext, role: USER_ROLES.DOCTOR });

    const withPassword = await User.findById(staff._id).select('+password');
    check(
      'the stored value is a bcrypt hash, not the plaintext',
      withPassword?.password?.startsWith('$2') === true && withPassword?.password !== plaintext
    );
    check('comparePassword accepts the right password', (await withPassword?.comparePassword(plaintext)) === true);
    check('comparePassword rejects a wrong password', (await withPassword?.comparePassword('wrong')) === false);

    const withoutPassword = await User.findById(staff._id);
    check('select:false keeps the hash out of an ordinary query', withoutPassword?.password === undefined);

    // Re-saving an unrelated field must not re-hash the already-hashed value.
    const hashBefore = withPassword?.password;
    if (withPassword) {
      withPassword.name = 'Verify Staff Renamed';
      await withPassword.save();
    }
    const afterRename = await User.findById(staff._id).select('+password');
    check('re-saving an unchanged password does not double-hash it', afterRename?.password === hashBefore);

    console.log('\nUser — defaults, normalization and DTO');
    check('email is lower-cased on write', staff.email === email('staff').toLowerCase());
    check('isApproved defaults to false', staff.isApproved === false);
    check('isActive defaults to true', staff.isActive === true);
    check('isEmailVerified defaults to false', staff.isEmailVerified === false);

    const duplicateEmail = await refusalFrom(() =>
      User.create({ name: 'Clash', email: email('staff'), password: plaintext, role: USER_ROLES.NURSE })
    );
    check('a duplicate email is refused by the unique index', duplicateEmail !== null && /duplicate key/i.test(duplicateEmail), duplicateEmail);

    const dto = userFromEntity(afterRename ?? staff);
    check('userFromEntity emits no password', !('password' in dto));
    check('userFromEntity emits no _id or __v', !('_id' in dto) && !('__v' in dto));
    check('userFromEntity exposes userId as a string', typeof dto.userId === 'string' && dto.userId.length === 24);
    check('userFromEntity serializes timestamps as ISO strings', typeof dto.createdAt === 'string' && dto.createdAt.endsWith('Z'));

    console.log('\nUser — the one super administrator');
    const existingSuperAdmin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).lean();
    const firstSuperAdmin = existingSuperAdmin
      ? null
      : await User.create({ name: 'Verify Super', email: email('super'), password: plaintext, role: USER_ROLES.SUPER_ADMIN });

    const secondSuperAdmin = await refusalFrom(() =>
      User.create({ name: 'Second Super', email: email('super2'), password: plaintext, role: USER_ROLES.SUPER_ADMIN })
    );
    check(
      'a second super administrator is refused by the partial unique index',
      secondSuperAdmin !== null && /duplicate key/i.test(secondSuperAdmin),
      secondSuperAdmin
    );

    const secondNurse = await User.create({ name: 'Verify Nurse', email: email('nurse'), password: plaintext, role: USER_ROLES.NURSE });
    const thirdNurse = await User.create({ name: 'Another Nurse', email: email('nurse2'), password: plaintext, role: USER_ROLES.NURSE });
    check('the partial index leaves every other role alone', Boolean(secondNurse._id) && Boolean(thirdNurse._id));

    console.log('\nUser — an account with no password');
    const counterPatient = await User.create({ name: 'Verify Patient', email: email('patient'), role: USER_ROLES.PATIENT });
    const counterWithPassword = await User.findById(counterPatient._id).select('+password');
    check('a counter-registered account saves with no password', counterWithPassword?.password === undefined);
    check(
      'comparePassword refuses rather than throwing when there is no password',
      (await counterWithPassword?.comparePassword('anything')) === false
    );

    console.log('\nDepartment');
    const department = await Department.create({ name: `Cardiology ${TAG}`, code: `c${TAG.slice(-6)}`, description: 'Heart' });
    check('the code is upper-cased on write', department.code === department.code.toUpperCase());
    check('isActive defaults to true', department.isActive === true);

    const duplicateCode = await refusalFrom(() => Department.create({ name: `Other ${TAG}`, code: department.code }));
    check('a duplicate code is refused', duplicateCode !== null && /duplicate key/i.test(duplicateCode), duplicateCode);

    const departmentDto = departmentFromEntity(department);
    check('departmentFromEntity nulls an absent head doctor rather than omitting it', departmentDto.headDoctorId === null);

    console.log('\nDoctor');
    const doctor = await Doctor.create({
      user: staff._id,
      department: department._id,
      specialization: 'Cardiology',
      registrationNo: `REG-${TAG}`,
      consultationFee: 50000,
    });
    check('isAcceptingPatients defaults to true', doctor.isAcceptingPatients === true);
    check('the fee is stored as the integer it was given', doctor.consultationFee === 50000);

    const secondDoctorRecord = await refusalFrom(() =>
      Doctor.create({ user: staff._id, department: department._id, specialization: 'Second', registrationNo: `REG2-${TAG}` })
    );
    check('one account cannot hold two doctor records', secondDoctorRecord !== null && /duplicate key/i.test(secondDoctorRecord), secondDoctorRecord);

    const duplicateRegistration = await refusalFrom(() =>
      Doctor.create({ user: secondNurse._id, department: department._id, specialization: 'Third', registrationNo: `REG-${TAG}` })
    );
    check(
      'a duplicate registration number is refused',
      duplicateRegistration !== null && /duplicate key/i.test(duplicateRegistration),
      duplicateRegistration
    );

    const doctorDto = doctorFromEntity(doctor);
    check('doctorFromEntity renders references as string ids', typeof doctorDto.userId === 'string' && typeof doctorDto.departmentId === 'string');
    check('doctorFromEntity carries no name — that belongs to the account', !('name' in doctorDto));

    console.log('\nPatient');
    const patient = await Patient.create({
      user: counterPatient._id,
      medicalRecordNo: `HMS-2026-${TAG.slice(-6).replace(/\D/g, '0').padStart(6, '0')}`,
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      emergencyContact: { name: 'Next Of Kin', relation: 'Sister', phone: '+8801712345678' },
    });
    check('array fields default to empty rather than undefined', Array.isArray(patient.chronicConditions) && patient.chronicConditions.length === 0);
    check('the record number is upper-cased on write', patient.medicalRecordNo === patient.medicalRecordNo.toUpperCase());

    const secondPatientRecord = await refusalFrom(() => Patient.create({ user: counterPatient._id, medicalRecordNo: `HMS-2026-999999` }));
    check(
      'one account cannot hold two patient records',
      secondPatientRecord !== null && /duplicate key/i.test(secondPatientRecord),
      secondPatientRecord
    );

    const duplicateRecordNo = await refusalFrom(() => Patient.create({ user: thirdNurse._id, medicalRecordNo: patient.medicalRecordNo }));
    check('a duplicate medical record number is refused', duplicateRecordNo !== null && /duplicate key/i.test(duplicateRecordNo), duplicateRecordNo);

    const tooManyEntries = await refusalFrom(() =>
      Patient.create({
        user: secondNurse._id,
        medicalRecordNo: `HMS-2026-888888`,
        allergies: Array.from({ length: 41 }, (_, index) => `Allergy ${index}`),
      })
    );
    check('the clinical-entry ceiling is enforced by the model', tooManyEntries !== null, tooManyEntries);

    console.log('\nPatient — the two DTO shapes');
    const fullDto = patientFromEntity(patient);
    check('patientFromEntity carries the clinical fields', fullDto.allergies.length === 1 && fullDto.bloodGroup === 'O+');
    check('patientFromEntity carries the emergency contact', fullDto.emergencyContact?.relation === 'Sister');

    const summaryDto = patientSummaryFromEntities(patient, counterPatient);
    check(
      'the summary carries the record number and the name',
      summaryDto.medicalRecordNo === patient.medicalRecordNo && summaryDto.name === 'Verify Patient'
    );
    check('the summary carries NO allergies', !('allergies' in summaryDto));
    check('the summary carries NO conditions', !('chronicConditions' in summaryDto));
    check('the summary carries NO blood group', !('bloodGroup' in summaryDto));
    check('the summary carries NO address', !('address' in summaryDto));
    check('the summary carries NO emergency contact', !('emergencyContact' in summaryDto));

    console.log('\nSchemas — parsing is idempotent where a Server Action re-parses it');
    const created = UserCreateSchema.safeParse({
      name: 'Parsed Person',
      email: '  MiXeD@Example.COM ',
      password: 'a long enough password',
      role: USER_ROLES.NURSE,
      phone: '017 1234 5678',
      dateOfBirth: '1990-04-12',
    });
    check('a valid create parses', created.success, created.success ? undefined : created.error.issues);

    if (created.success) {
      check('email is trimmed and lower-cased by the schema', created.data.email === 'mixed@example.com');
      check('a local phone number normalizes to stored form', created.data.phone === '+8801712345678');
      check('a date string becomes a Date', created.data.dateOfBirth instanceof Date);

      // The second pass a Server Action makes over the browser's already-parsed output.
      const secondPass = UserCreateSchema.safeParse({ ...created.data, password: 'a long enough password' });
      check('re-parsing the schema output succeeds', secondPass.success, secondPass.success ? undefined : secondPass.error.issues);
      check('re-parsing leaves the phone unchanged', secondPass.success && secondPass.data.phone === '+8801712345678');
      check(
        're-parsing leaves the date unchanged',
        secondPass.success && secondPass.data.dateOfBirth?.getTime() === created.data.dateOfBirth?.getTime()
      );
    }

    const futureBirth = UserUpdateSchema.safeParse({
      userId: String(staff._id),
      name: 'Future Person',
      email: email('future'),
      dateOfBirth: '2099-01-01',
    });
    check('a future date of birth is refused', !futureBirth.success);
    check(
      'and it is refused on the dateOfBirth field',
      !futureBirth.success && futureBirth.error.issues.some(issue => issue.path.includes('dateOfBirth')),
      futureBirth.success ? undefined : futureBirth.error.issues
    );

    const badPhone = UserCreateSchema.safeParse({
      name: 'Bad Phone',
      email: email('bad'),
      password: 'a long enough password',
      role: USER_ROLES.NURSE,
      phone: '12345',
    });
    check('a number that is not a Bangladesh mobile is refused', !badPhone.success);

    const fractionalFee = DoctorCreateSchema.safeParse({
      userId: String(staff._id),
      departmentId: String(department._id),
      specialization: 'Cardiology',
      registrationNo: 'REG-1',
      consultationFee: '500.5',
    });
    check('a fractional consultation fee is refused', !fractionalFee.success);

    const blankAllergyRows = PatientCreateSchema.safeParse({ userId: String(counterPatient._id), allergies: ['Penicillin', '', '   ', 'Sulfa'] });
    check(
      'blank clinical rows are dropped rather than refused',
      blankAllergyRows.success && blankAllergyRows.data.allergies?.length === 2,
      blankAllergyRows.success ? blankAllergyRows.data.allergies : blankAllergyRows.error.issues
    );

    const suppliedRecordNo = PatientCreateSchema.safeParse({ userId: String(counterPatient._id), medicalRecordNo: 'HMS-2026-000001' });
    check(
      'a caller cannot supply its own medical record number',
      suppliedRecordNo.success && !('medicalRecordNo' in suppliedRecordNo.data),
      suppliedRecordNo.success ? suppliedRecordNo.data : suppliedRecordNo.error.issues
    );

    // Keep the compiler honest about the fixtures the cleanup below relies on.
    void firstSuperAdmin;
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${TAG}@example\\.test$`);
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(x => x._id);

    const removedPatients = await Patient.deleteMany({ user: { $in: userIds } });
    const removedDoctors = await Doctor.deleteMany({ user: { $in: userIds } });
    const removedDepartments = await Department.deleteMany({ name: new RegExp(TAG) });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(
      `  removed ${removedUsers.deletedCount} user(s), ${removedDoctors.deletedCount} doctor(s), ` +
        `${removedPatients.deletedCount} patient(s), ${removedDepartments.deletedCount} department(s)`
    );

    const leftBehind = await User.countDocuments({ email: emailPattern });
    check('nothing this run created is left behind', leftBehind === 0, `${leftBehind} user(s) remain`);

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
