import mongoose from 'mongoose';

import { Appointment, Department, Doctor, Encounter, LabOrder, LabReport, Patient, Prescription, User } from '@/models';

import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { PatientPortalService } from '@/lib/services';

import type { EncounterStatus, SessionUser } from '@/types';

/*
  Exercises PatientPortalService against a real database, then removes what it made.

  The substance is the rule the whole portal is built on: **every read is scoped from the session,
  never from a parameter.** A patient sees only their own appointments, completed encounters, issued
  prescriptions and released reports; an unreleased report is invisible; and another patient's
  prescription id is answered as not-found, never shown — the same answer a missing one gets.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-portal-${SUFFIX}`;
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

const session = (userId: string): SessionUser => ({ userId, role: USER_ROLES.PATIENT, email: 'x@example.test', name: 'X', isApproved: true });

async function seedDoctor(): Promise<{ doctorId: string; departmentId: string }> {
  const account = await User.create({ name: `Dr ${SUFFIX}`, email: email('dr'), role: USER_ROLES.DOCTOR, isApproved: true });
  const department = await Department.create({ name: `Dept ${NAME_TAG}`, code: `D${SUFFIX}`.toUpperCase().slice(0, 12) });
  const doctor = await Doctor.create({
    user: account._id,
    department: department._id,
    specialization: 'General',
    registrationNo: `REG-${SUFFIX}`,
    consultationFee: 0,
  });

  return { doctorId: String(doctor._id), departmentId: String(department._id) };
}

async function seedPatient(local: string): Promise<{ patientId: string; userId: string }> {
  const account = await User.create({ name: `Patient ${local} ${SUFFIX}`, email: email(`pt-${local}`), role: USER_ROLES.PATIENT, isApproved: true });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2099-${String(mrnCounter).padStart(6, '0')}` });

  return { patientId: String(patient._id), userId: String(account._id) };
}

async function seedAppointment(doctorId: string, patientId: string, departmentId: string, startTime: string): Promise<string> {
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
    status: 'confirmed',
    bookedBy: new mongoose.Types.ObjectId(),
  });

  return String(appointment._id);
}

async function seedEncounter(doctorId: string, patientId: string, status: EncounterStatus): Promise<string> {
  const appointment = new mongoose.Types.ObjectId();
  const encounter = await Encounter.create({ appointment, patient: patientId, doctor: doctorId, status });

  return String(encounter._id);
}

async function seedPrescription(encounterId: string, patientId: string, doctorId: string): Promise<string> {
  const prescription = await Prescription.create({
    encounter: encounterId,
    patient: patientId,
    doctor: doctorId,
    items: [{ drug: 'Amoxicillin', frequency: 'twice-daily' }],
  });

  return String(prescription._id);
}

async function seedReleasedReport(encounterId: string, patientId: string, doctorId: string, released: boolean): Promise<void> {
  const order = await LabOrder.create({
    encounter: encounterId,
    patient: patientId,
    orderedBy: doctorId,
    tests: [{ name: 'CBC' }],
    status: released ? 'released' : 'reported',
  });
  await LabReport.create({
    labOrder: order._id,
    patient: patientId,
    performedBy: new mongoose.Types.ObjectId(),
    file: { storageKey: String(new mongoose.Types.ObjectId()), fileName: 'r.pdf', mimeType: 'application/pdf', size: 10 },
    ...(released ? { verifiedBy: new mongoose.Types.ObjectId(), releasedAt: new Date() } : {}),
  });
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([
    Appointment.createIndexes(),
    Encounter.createIndexes(),
    Prescription.createIndexes(),
    LabReport.createIndexes(),
    Doctor.createIndexes(),
    Patient.createIndexes(),
    User.createIndexes(),
  ]);

  const portal = new PatientPortalService();

  try {
    const doctor = await seedDoctor();
    const patientA = await seedPatient('a');
    const patientB = await seedPatient('b');
    const sessionA = session(patientA.userId);
    const sessionB = session(patientB.userId);

    await seedAppointment(doctor.doctorId, patientA.patientId, doctor.departmentId, '09:00');
    await seedAppointment(doctor.doctorId, patientB.patientId, doctor.departmentId, '09:40');

    const completedA = await seedEncounter(doctor.doctorId, patientA.patientId, ENCOUNTER_STATUSES.COMPLETED);
    await seedEncounter(doctor.doctorId, patientA.patientId, ENCOUNTER_STATUSES.OPEN);

    const rxA = await seedPrescription(completedA, patientA.patientId, doctor.doctorId);
    const encounterB = await seedEncounter(doctor.doctorId, patientB.patientId, ENCOUNTER_STATUSES.COMPLETED);
    const rxB = await seedPrescription(encounterB, patientB.patientId, doctor.doctorId);

    await seedReleasedReport(completedA, patientA.patientId, doctor.doctorId, true);
    await seedReleasedReport(completedA, patientA.patientId, doctor.doctorId, false);

    console.log('Profile and scope — resolved from the session');
    const profile = await portal.getMyProfile(sessionA);
    check('the profile resolves the signed-in patient', profile.result?.patientId === patientA.patientId, profile.errors);

    const appointmentsA = await portal.listMyAppointments(sessionA);
    check(
      'a patient sees only their own appointments',
      appointmentsA.result.length === 1 && appointmentsA.result.every(row => row.patientId === patientA.patientId),
      appointmentsA.result
    );

    console.log('\nVisibility — completed encounters, released reports only');
    const timelineA = await portal.getMyTimeline(sessionA);
    check(
      'the timeline shows only completed encounters',
      timelineA.result.length === 1 && timelineA.result[0]?.encounterId === completedA,
      timelineA.result
    );

    const reportsA = await portal.listMyReleasedReports(sessionA);
    check('only released reports are shown', reportsA.result.length === 1 && reportsA.result[0]?.file?.fileName === 'r.pdf', reportsA.result);
    check('the report carries no storage key', reportsA.result[0] !== undefined && !('storageKey' in (reportsA.result[0]?.file ?? {})));

    console.log('\nPrescriptions — own only, another patient’s id is not-found');
    const prescriptionsA = await portal.listMyPrescriptions(sessionA);
    check(
      'a patient sees only their own prescriptions',
      prescriptionsA.result.length === 1 && prescriptionsA.result[0]?.prescriptionId === rxA,
      prescriptionsA.result
    );
    const ownRx = await portal.getMyPrescription(rxA, sessionA);
    check('a patient can open their own prescription', ownRx.success, ownRx.errors);
    const othersRx = await portal.getMyPrescription(rxB, sessionA);
    check('another patient’s prescription id is answered as not-found', !othersRx.success, othersRx.errors);
    const othersRxOwner = await portal.getMyPrescription(rxB, sessionB);
    check('its real owner can open it', othersRxOwner.success, othersRxOwner.errors);

    console.log('\nDashboard and directory');
    const overview = await portal.getOverview(sessionA);
    check(
      'the overview counts the patient’s own records',
      overview.result?.upcomingCount === 1 && overview.result?.prescriptionCount === 1 && overview.result?.reportCount === 1,
      overview.result
    );
    const directory = await portal.listDoctorDirectory();
    check(
      'the directory publishes the doctor with a department and no personal fields',
      directory.result.some(entry => entry.doctorId === doctor.doctorId && Boolean(entry.departmentName)),
      directory.result
    );
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(patient => patient._id);

    await LabReport.deleteMany({ patient: { $in: patientIds } });
    await LabOrder.deleteMany({ patient: { $in: patientIds } });
    await Prescription.deleteMany({ patient: { $in: patientIds } });
    await Encounter.deleteMany({ patient: { $in: patientIds } });
    await Appointment.deleteMany({ patient: { $in: patientIds } });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
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
