import mongoose from 'mongoose';

import { Appointment, Department, Doctor, Encounter, LabOrder, LabReport, Patient, User } from '@/models';

import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { LAB_STATUSES } from '@/constants/lab.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { LabService } from '@/lib/services';
import { storage } from '@/lib/storage';

import type { EncounterStatus, SessionUser, UserRole } from '@/types';

/*
  Exercises LabService against a real database and GridFS bucket, then removes what it made.

  The substance is the three rules the screen cannot vouch for: an order is raised into the ordering
  doctor's **own open encounter**; an uploaded report file is validated by its **magic number**, not
  its name; and a report is **released, not merely uploaded** — visible to the lab always, to the
  ordering doctor and patient only after it is verified and released, and reported as *not found* to
  anyone else, so an id-guesser learns nothing.

  Fixtures carry a run-scoped suffix and are removed case-insensitively; the stored files are removed
  by their storage key.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-lab-${SUFFIX}`;
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();

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

const session = (userId: string, role: UserRole): SessionUser => ({ userId, role, email: 'x@example.test', name: 'X', isApproved: true });

async function seedDoctor(local: string): Promise<{ doctorId: string; userId: string; departmentId: string }> {
  const account = await User.create({ name: `Dr ${local} ${SUFFIX}`, email: email(`dr-${local}`), role: USER_ROLES.DOCTOR, isApproved: true });
  const department = await Department.create({ name: `Dept ${local} ${NAME_TAG}`, code: `D${local}${SUFFIX}`.toUpperCase().slice(0, 12) });
  const doctor = await Doctor.create({
    user: account._id,
    department: department._id,
    specialization: 'General',
    registrationNo: `REG-${local}-${SUFFIX}`,
    consultationFee: 0,
  });

  return { doctorId: String(doctor._id), userId: String(account._id), departmentId: String(department._id) };
}

async function seedLabAccount(): Promise<string> {
  const account = await User.create({ name: `Lab ${SUFFIX}`, email: email('lab'), role: USER_ROLES.LAB, isApproved: true });

  return String(account._id);
}

async function seedPatient(): Promise<{ patientId: string; userId: string }> {
  const account = await User.create({ name: `Patient ${SUFFIX}`, email: email('pt'), role: USER_ROLES.PATIENT, isApproved: true });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2099-${String(mrnCounter).padStart(6, '0')}` });

  return { patientId: String(patient._id), userId: String(account._id) };
}

async function seedEncounter(
  doctorId: string,
  patientId: string,
  departmentId: string,
  status: EncounterStatus,
  startTime = '09:00'
): Promise<string> {
  const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
  const endMinutes = startMinutes + 20;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  const appointment = await Appointment.create({
    patient: patientId,
    doctor: doctorId,
    department: departmentId,
    date: '2099-06-15',
    startTime,
    endTime,
    status: 'in-consultation',
    bookedBy: new mongoose.Types.ObjectId(),
  });

  const encounter = await Encounter.create({ appointment: appointment._id, patient: patientId, doctor: doctorId, status });

  return String(encounter._id);
}

const pdfFile = (name: string) =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a])], name, { type: 'application/pdf' });
const fakePdf = (name: string) => new File([new TextEncoder().encode('this is definitely not a pdf file')], name, { type: 'application/pdf' });
const emptyPdf = (name: string) => new File([], name, { type: 'application/pdf' });

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([
    Appointment.createIndexes(),
    Encounter.createIndexes(),
    LabOrder.createIndexes(),
    LabReport.createIndexes(),
    Doctor.createIndexes(),
    Patient.createIndexes(),
    User.createIndexes(),
  ]);

  const lab = new LabService();

  try {
    const drA = await seedDoctor('aa');
    const drB = await seedDoctor('bb');
    const labUserId = await seedLabAccount();
    const patient = await seedPatient();

    const labSession = session(labUserId, USER_ROLES.LAB);
    const drASession = session(drA.userId, USER_ROLES.DOCTOR);
    const drBSession = session(drB.userId, USER_ROLES.DOCTOR);
    const patientSession = session(patient.userId, USER_ROLES.PATIENT);

    const openEncounter = await seedEncounter(drA.doctorId, patient.patientId, drA.departmentId, ENCOUNTER_STATUSES.OPEN, '09:00');

    console.log('Order — from the ordering doctor’s own open encounter');
    const ordered = await lab.createOrder(
      { encounterId: openEncounter, tests: [{ name: 'Complete blood count', code: 'cbc' }], priority: 'routine', notes: '' },
      drA.userId
    );
    check('an order is placed from an open encounter', ordered.success && ordered.result?.status === LAB_STATUSES.ORDERED, ordered.errors);
    check(
      'the patient and encounter are derived from the encounter',
      ordered.result?.patientId === patient.patientId && ordered.result?.encounterId === openEncounter
    );
    check('the test code is stored uppercased', ordered.result?.tests[0]?.code === 'CBC', ordered.result?.tests);

    const byStranger = await lab.createOrder({ encounterId: openEncounter, tests: [{ name: 'X' }], priority: 'routine', notes: '' }, drB.userId);
    check('another doctor cannot order against this encounter', !byStranger.success, byStranger.errors);

    const closedEncounter = await seedEncounter(drA.doctorId, patient.patientId, drA.departmentId, ENCOUNTER_STATUSES.COMPLETED, '10:00');
    const againstClosed = await lab.createOrder({ encounterId: closedEncounter, tests: [{ name: 'X' }], priority: 'routine', notes: '' }, drA.userId);
    check('an order cannot be raised against a completed encounter', !againstClosed.success, againstClosed.errors);

    const orderId = ordered.result?.labOrderId ?? '';

    console.log('\nLifecycle — legal moves only');
    const collected = await lab.changeOrderStatus({ labOrderId: orderId, status: LAB_STATUSES.COLLECTED, cancelledReason: '' });
    check('ordered → collected is allowed', collected.success && collected.result?.status === LAB_STATUSES.COLLECTED, collected.errors);
    const inProgress = await lab.changeOrderStatus({ labOrderId: orderId, status: LAB_STATUSES.IN_PROGRESS, cancelledReason: '' });
    check('collected → in-progress is allowed', inProgress.success && inProgress.result?.status === LAB_STATUSES.IN_PROGRESS, inProgress.errors);
    const jumpToReleased = await lab.changeOrderStatus({ labOrderId: orderId, status: LAB_STATUSES.RELEASED, cancelledReason: '' });
    check('a hand cannot move an order straight to released', !jumpToReleased.success, jumpToReleased.errors);

    console.log('\nUpload — the file is trusted by its bytes');
    const wrongMagic = await lab.uploadReport({ labOrderId: orderId, summary: '', findings: '', file: fakePdf('fake.pdf') }, labSession);
    check('a file whose bytes do not match its type is refused', !wrongMagic.success, wrongMagic.errors);
    const emptyFile = await lab.uploadReport({ labOrderId: orderId, summary: '', findings: '', file: emptyPdf('empty.pdf') }, labSession);
    check('an empty file is refused', !emptyFile.success, emptyFile.errors);

    const uploaded = await lab.uploadReport(
      { labOrderId: orderId, summary: 'All normal.', findings: 'Within range.', file: pdfFile('cbc.pdf') },
      labSession
    );
    check('a valid report file is stored', uploaded.success && Boolean(uploaded.result?.file), uploaded.errors);
    check(
      'the DTO carries the file name but no storage key',
      uploaded.result?.file?.fileName === 'cbc.pdf' && !('storageKey' in (uploaded.result?.file ?? {}))
    );
    const orderAfterUpload = await LabOrder.findById(orderId).lean<{ status: string } | null>();
    check('uploading moved the order to reported', orderAfterUpload?.status === LAB_STATUSES.REPORTED);

    const uploadAgain = await lab.uploadReport({ labOrderId: orderId, summary: '', findings: '', file: pdfFile('again.pdf') }, labSession);
    check('a second report on the same order is refused', !uploadAgain.success, uploadAgain.errors);

    const reportId = uploaded.result?.labReportId ?? '';

    console.log('\nAccess — the lab always; the doctor and patient only once released');
    const labReads = await lab.getReport(reportId, labSession);
    check('the lab can read the report before release', labReads.success, labReads.errors);
    const doctorBeforeRelease = await lab.getReport(reportId, drASession);
    check('the ordering doctor cannot read the report before release', !doctorBeforeRelease.success, doctorBeforeRelease.errors);
    const patientBeforeRelease = await lab.getReport(reportId, patientSession);
    check('the patient cannot read the report before release', !patientBeforeRelease.success);
    const downloadBeforeRelease = await lab.openReportForDownload(reportId, drASession);
    check('the doctor cannot download the file before release', !downloadBeforeRelease.success);

    const labDownload = await lab.openReportForDownload(reportId, labSession);
    check('the lab can open the file for download', labDownload.success && Boolean(labDownload.result?.stream), labDownload.errors);
    if (labDownload.result) {
      await labDownload.result.stream.cancel();
    }

    console.log('\nRelease — verified, then visible');
    const released = await lab.releaseReport({ labReportId: reportId }, labSession);
    check('the report releases', released.success && released.result?.isReleased === true, released.errors);
    const releasedRow = await LabReport.findById(reportId).lean<{ verifiedBy?: mongoose.Types.ObjectId } | null>();
    check('the verifier is stamped from the session', String(releasedRow?.verifiedBy) === labUserId);
    const orderAfterRelease = await LabOrder.findById(orderId).lean<{ status: string } | null>();
    check('releasing moved the order to released', orderAfterRelease?.status === LAB_STATUSES.RELEASED);

    const releaseAgain = await lab.releaseReport({ labReportId: reportId }, labSession);
    check('an already-released report cannot be released again', !releaseAgain.success, releaseAgain.errors);

    const doctorAfterRelease = await lab.getReport(reportId, drASession);
    check('the ordering doctor can read the report once released', doctorAfterRelease.success, doctorAfterRelease.errors);
    const strangerAfterRelease = await lab.getReport(reportId, drBSession);
    check('a doctor who did not order it cannot read the report', !strangerAfterRelease.success);
    const patientAfterRelease = await lab.getReport(reportId, patientSession);
    check('the owning patient can read the report once released', patientAfterRelease.success, patientAfterRelease.errors);
    const doctorDownload = await lab.openReportForDownload(reportId, drASession);
    check(
      'the ordering doctor can download the file once released',
      doctorDownload.success && Boolean(doctorDownload.result?.stream),
      doctorDownload.errors
    );
    if (doctorDownload.result) {
      await doctorDownload.result.stream.cancel();
    }

    console.log('\nListing — the order carries its released report');
    const doctorOrders = await lab.listOrdersForDoctor(drA.doctorId);
    const row = doctorOrders.result.find(order => order.labOrderId === orderId);
    check(
      'the doctor’s order list links the released report',
      Boolean(row) && row?.reportReleased === true && row?.reportId === reportId,
      doctorOrders.result
    );

    console.log('\nWork list — most urgent first, by clinical urgency not spelling');
    const routineOrder = await lab.createOrder(
      { encounterId: openEncounter, tests: [{ name: 'Routine panel' }], priority: 'routine', notes: '' },
      drA.userId
    );
    const urgentOrder = await lab.createOrder(
      { encounterId: openEncounter, tests: [{ name: 'Urgent panel' }], priority: 'urgent', notes: '' },
      drA.userId
    );
    const statOrder = await lab.createOrder(
      { encounterId: openEncounter, tests: [{ name: 'Immediate draw' }], priority: 'stat', notes: '' },
      drA.userId
    );
    const mine = new Set([routineOrder.result?.labOrderId, urgentOrder.result?.labOrderId, statOrder.result?.labOrderId]);
    const workList = await lab.getWorkList();
    const orderedPriorities = workList.result.filter(order => mine.has(order.labOrderId)).map(order => order.priority);
    check('stat sorts above urgent sorts above routine', orderedPriorities.join(',') === 'stat,urgent,routine', orderedPriorities);

    console.log('\nUpload — refused against a cancelled order');
    const cancelled = await lab.changeOrderStatus({
      labOrderId: statOrder.result?.labOrderId ?? '',
      status: LAB_STATUSES.CANCELLED,
      cancelledReason: 'test',
    });
    check('the order cancels', cancelled.success, cancelled.errors);
    const uploadToCancelled = await lab.uploadReport(
      { labOrderId: statOrder.result?.labOrderId ?? '', summary: '', findings: '', file: pdfFile('x.pdf') },
      labSession
    );
    check('a report cannot be filed against a cancelled order', !uploadToCancelled.success, uploadToCancelled.errors);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(patient => patient._id);

    // Remove the stored files first, by the storage key on each report — bytes the row cleanup would otherwise orphan.
    const reports = await LabReport.find({ patient: { $in: patientIds } })
      .select('file.storageKey')
      .lean<{ file?: { storageKey: string } }[]>();
    for (const report of reports) {
      if (report.file?.storageKey) {
        await storage.remove(report.file.storageKey);
      }
    }

    const removedReports = await LabReport.deleteMany({ patient: { $in: patientIds } });
    await LabOrder.deleteMany({ patient: { $in: patientIds } });
    await Encounter.deleteMany({ patient: { $in: patientIds } });
    await Appointment.deleteMany({ patient: { $in: patientIds } });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedReports.deletedCount} report(s), ${removedUsers.deletedCount} user(s)`);
    check(
      'nothing this run created is left behind',
      (await User.countDocuments({ email: emailPattern })) === 0 && (await LabReport.countDocuments({ patient: { $in: patientIds } })) === 0
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
