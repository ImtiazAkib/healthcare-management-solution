import mongoose from 'mongoose';

import { Department, Doctor, Notice, User } from '@/models';
import { SessionUser } from '@/types';

import { NOTICE_AUDIENCES, NOTICE_CATEGORIES } from '@/constants/notice.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { NoticeService } from '@/lib/services';
import { storage } from '@/lib/storage';

import type { UserEntity } from '@/models/user.model';

/*
  Exercises NoticeService against a real database, then removes what it made.

  The substance is the rules the screen cannot vouch for: audience targeting is a **query**, so a
  patient's feed never carries a staff notice and a department notice reaches only its department; an
  **emergency** pins to the top ahead of a newer notice; a title or body carrying a **medical record
  number** is refused; and an image is **magic-number checked** — a mislabelled file is refused, a
  real one stores and streams, and a viewer outside the audience gets a not-found.

  Fixtures carry a run-scoped suffix in their title/email and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();
const titled = (text: string) => `${text} [${SUFFIX}]`;

let failures = 0;

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

function pngFile(): File {
  // The 8-byte PNG signature — enough for the magic-number check, which reads the first four.
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'banner.png', { type: 'image/png' });
}

function mislabelledImage(): File {
  // Declares PNG but opens with `%PDF` — the mislabel a magic-number check exists to catch.
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'fake.png', { type: 'image/png' });
}

async function createStaff(local: string, name: string, role: SessionUser['role']): Promise<UserEntity> {
  const account = await User.create({ name, email: email(local), role, isEmailVerified: true, isApproved: true, isActive: true });

  return account.toObject();
}

function has(ids: string[], id: string | undefined): boolean {
  return Boolean(id) && ids.includes(id as string);
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Department.createIndexes(), Doctor.createIndexes(), Notice.createIndexes()]);

  const notices = new NoticeService();

  try {
    const admin = await createStaff('admin', 'Ada Admin', USER_ROLES.ADMIN);
    const nurse = await createStaff('nurse', 'Nora Nurse', USER_ROLES.NURSE);
    const patientAccount = await User.create({
      name: 'Pat Patient',
      email: email('patient'),
      role: USER_ROLES.PATIENT,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const patient = sessionOf(patientAccount.toObject());

    const [deptA, deptB] = await Promise.all([
      Department.create({ name: titled('Cardiology'), code: `CAR${SUFFIX}`.slice(0, 12) }),
      Department.create({ name: titled('Orthopedics'), code: `ORT${SUFFIX}`.slice(0, 12) }),
    ]);
    const doctorAUser = await createStaff('doc-a', 'Dr A', USER_ROLES.DOCTOR);
    const doctorBUser = await createStaff('doc-b', 'Dr B', USER_ROLES.DOCTOR);
    await Doctor.create({ user: doctorAUser._id, department: deptA._id, specialization: 'Cardiology', registrationNo: `REG-A-${SUFFIX}` });
    await Doctor.create({ user: doctorBUser._id, department: deptB._id, specialization: 'Orthopedics', registrationNo: `REG-B-${SUFFIX}` });
    const docA = sessionOf(doctorAUser);
    const docB = sessionOf(doctorBUser);
    const adminSession = sessionOf(admin);
    const nurseSession = sessionOf(nurse);

    console.log('Audience — a patient notice reaches patients, not staff');
    const emergencyNotice = await notices.create(
      {
        title: titled('Ward evacuation drill'),
        body: 'Now.',
        audience: NOTICE_AUDIENCES.EVERYONE,
        category: NOTICE_CATEGORIES.EMERGENCY,
        departmentId: undefined,
      },
      null,
      adminSession
    );
    const everyoneNotice = await notices.create(
      {
        title: titled('Cafeteria reopens'),
        body: 'From Monday.',
        audience: NOTICE_AUDIENCES.EVERYONE,
        category: NOTICE_CATEGORIES.GENERAL,
        departmentId: undefined,
      },
      null,
      adminSession
    );
    const patientsNotice = await notices.create(
      { title: titled('Bring your card'), audience: NOTICE_AUDIENCES.PATIENTS, category: NOTICE_CATEGORIES.GENERAL, departmentId: undefined },
      null,
      adminSession
    );
    const staffNotice = await notices.create(
      { title: titled('Payroll date'), audience: NOTICE_AUDIENCES.STAFF, category: NOTICE_CATEGORIES.GENERAL, departmentId: undefined },
      null,
      adminSession
    );
    check(
      'every publish succeeded',
      [emergencyNotice, everyoneNotice, patientsNotice, staffNotice].every(result => result.success),
      staffNotice.errors
    );

    const patientFeed = await notices.listForRole(patient);
    const patientIds = patientFeed.result.map(notice => notice.noticeId);
    check(
      'the patient sees the everyone and patients notices',
      has(patientIds, everyoneNotice.result?.noticeId) && has(patientIds, patientsNotice.result?.noticeId)
    );
    check('the patient does NOT see the staff notice', !has(patientIds, staffNotice.result?.noticeId));

    const nurseFeed = await notices.listForRole(nurseSession);
    const nurseIds = nurseFeed.result.map(notice => notice.noticeId);
    check('the nurse sees the staff notice', has(nurseIds, staffNotice.result?.noticeId));
    check('the nurse does NOT see the patients notice', !has(nurseIds, patientsNotice.result?.noticeId));

    console.log('\nEmergency — pins to the top ahead of a newer notice');
    check(
      'the first notice on the patient feed is the emergency, though it was not the newest',
      patientFeed.result[0]?.noticeId === emergencyNotice.result?.noticeId
    );

    console.log('\nDepartment — reaches only that department');
    const deptNotice = await notices.create(
      {
        title: titled('Cardiology rounds moved'),
        audience: NOTICE_AUDIENCES.DEPARTMENT,
        category: NOTICE_CATEGORIES.GENERAL,
        departmentId: String(deptA._id),
      },
      null,
      adminSession
    );
    check(
      'publishing a department notice succeeds and carries its department',
      deptNotice.success && deptNotice.result?.departmentName === titled('Cardiology'),
      deptNotice.errors
    );
    const docAids = (await notices.listForRole(docA)).result.map(notice => notice.noticeId);
    const docBids = (await notices.listForRole(docB)).result.map(notice => notice.noticeId);
    check('the department doctor sees the department notice', has(docAids, deptNotice.result?.noticeId));
    check('a doctor in another department does NOT see it', !has(docBids, deptNotice.result?.noticeId));
    check(
      'the patient does NOT see the department notice',
      !(await notices.listForRole(patient)).result.map(notice => notice.noticeId).includes(deptNotice.result?.noticeId ?? '')
    );

    const missingDept = await notices.create(
      {
        title: titled('Ghost department'),
        audience: NOTICE_AUDIENCES.DEPARTMENT,
        category: NOTICE_CATEGORIES.GENERAL,
        departmentId: '507f1f77bcf86cd799439011',
      },
      null,
      adminSession
    );
    check('a department notice for a department that does not exist is refused', !missingDept.success, missingDept.errors);

    console.log('\nMedical record number — refused in a title or a body');
    const mrnBody = await notices.create(
      {
        title: titled('Records notice'),
        body: 'See patient HMS-2026-000417 for details.',
        audience: NOTICE_AUDIENCES.STAFF,
        category: NOTICE_CATEGORIES.GENERAL,
        departmentId: undefined,
      },
      null,
      adminSession
    );
    check('a body carrying a medical record number is refused', !mrnBody.success, mrnBody.errors);
    const mrnTitle = await notices.create(
      { title: titled('HMS-2026-000999 update'), audience: NOTICE_AUDIENCES.STAFF, category: NOTICE_CATEGORIES.GENERAL, departmentId: undefined },
      null,
      adminSession
    );
    check('a title carrying a medical record number is refused', !mrnTitle.success, mrnTitle.errors);

    console.log('\nImage — magic-number checked, audience-gated, cleaned up on delete');
    const mislabelled = await notices.create(
      { title: titled('Bad banner'), audience: NOTICE_AUDIENCES.EVERYONE, category: NOTICE_CATEGORIES.GENERAL, departmentId: undefined },
      mislabelledImage(),
      adminSession
    );
    check('an image whose bytes do not match its type is refused', !mislabelled.success, mislabelled.errors);

    const staffImage = await notices.create(
      { title: titled('Staff banner'), audience: NOTICE_AUDIENCES.STAFF, category: NOTICE_CATEGORIES.GENERAL, departmentId: undefined },
      pngFile(),
      adminSession
    );
    check('a real image publishes and records that it has one', staffImage.success && staffImage.result?.hasImage === true, staffImage.errors);
    const imageId = staffImage.result?.noticeId ?? '';
    const openForNurse = await notices.openImage(imageId, nurseSession);
    check('a staff viewer can open the staff-notice image', openForNurse.success && (openForNurse.result?.size ?? 0) > 0, openForNurse.errors);
    const openForPatient = await notices.openImage(imageId, patient);
    check('a patient cannot open a staff-notice image — same not-found as a missing one', !openForPatient.success);

    const storedImage = await Notice.findById(imageId).lean();
    const storageKey = storedImage?.image?.storageKey ?? '';
    const deleted = await notices.delete(imageId);
    check('deleting the notice succeeds', deleted.success, deleted.errors);
    check('the image bytes are gone after the notice is deleted', (await storage.read(storageKey)) === null);
  } finally {
    console.log('\nCleaning up');
    const titlePattern = new RegExp(`\\[${SUFFIX}\\]`);
    const leftover = await Notice.find({ title: titlePattern }).lean();
    await Promise.all(leftover.filter(notice => notice.image).map(notice => storage.remove(notice.image?.storageKey ?? '')));
    await Notice.deleteMany({ title: titlePattern });

    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    await Doctor.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await Department.deleteMany({ name: titlePattern });

    check(
      'nothing this run created is left behind',
      (await Notice.countDocuments({ title: titlePattern })) === 0 && (await User.countDocuments({ email: emailPattern })) === 0
    );

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
