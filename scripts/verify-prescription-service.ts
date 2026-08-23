import mongoose from 'mongoose';

import { Appointment, Department, Doctor, Encounter, Patient, Prescription, User } from '@/models';

import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { PRESCRIPTION_FREQUENCIES } from '@/constants/prescription.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { PrescriptionService } from '@/lib/services';

import type { EncounterStatus } from '@/types';

/*
  Exercises PrescriptionService against a real database, then removes what it made.

  The substance is the rules the screen cannot vouch for: a prescription is issued only into the
  requester's **own open encounter** — another doctor's encounter, or a completed one, is refused —
  the patient and doctor are **derived from the encounter**, never sent, and an issued prescription
  is **immutable**: the only change is a new prescription that **supersedes** the old, leaving both
  on the record.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-rx-${SUFFIX}`;
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

async function seedDoctor(local: string): Promise<{ doctorId: string; userId: string; departmentId: string }> {
  const account = await User.create({
    name: `Dr ${local} ${SUFFIX}`,
    email: email(`dr-${local}`),
    role: USER_ROLES.DOCTOR,
    isEmailVerified: true,
    isApproved: true,
  });
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

async function seedPatient(local: string): Promise<string> {
  const account = await User.create({ name: `Patient ${local} ${SUFFIX}`, email: email(`pt-${local}`), role: USER_ROLES.PATIENT, isApproved: true });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2099-${String(mrnCounter).padStart(6, '0')}` });

  return String(patient._id);
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

const item = (drug: string) => ({ drug, frequency: PRESCRIPTION_FREQUENCIES.TWICE_DAILY, dose: '1 tablet', duration: '5 days' });

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([
    Appointment.createIndexes(),
    Encounter.createIndexes(),
    Prescription.createIndexes(),
    Doctor.createIndexes(),
    Patient.createIndexes(),
    User.createIndexes(),
  ]);

  const prescriptions = new PrescriptionService();

  try {
    const drA = await seedDoctor('aa');
    const drB = await seedDoctor('bb');
    const patient = await seedPatient('p');

    const openEncounter = await seedEncounter(drA.doctorId, patient, drA.departmentId, ENCOUNTER_STATUSES.OPEN, '09:00');

    console.log('Issue — from the requester’s own open encounter');
    const issued = await prescriptions.issue({ encounterId: openEncounter, items: [item('Amoxicillin')], advice: 'Finish the course.' }, drA.userId);
    check('a prescription issues from an open encounter', issued.success && issued.result?.items.length === 1, issued.errors);
    check('the patient and doctor are derived from the encounter', issued.result?.patientId === patient && issued.result?.doctorId === drA.doctorId);
    check('it is issued with a timestamp', Boolean(issued.result?.issuedAt));

    console.log('\nGuards — whose encounter, and is it open');
    const byStranger = await prescriptions.issue({ encounterId: openEncounter, items: [item('Ibuprofen')], advice: '' }, drB.userId);
    check('another doctor cannot issue against this encounter', !byStranger.success, byStranger.errors);

    const completedEncounter = await seedEncounter(drA.doctorId, patient, drA.departmentId, ENCOUNTER_STATUSES.COMPLETED, '10:00');
    const againstClosed = await prescriptions.issue({ encounterId: completedEncounter, items: [item('Paracetamol')], advice: '' }, drA.userId);
    check('a prescription cannot be issued against a completed encounter', !againstClosed.success, againstClosed.errors);

    console.log('\nSupersede — the only change an issued prescription allows');
    const firstId = issued.result?.prescriptionId ?? '';
    const replaced = await prescriptions.supersede(
      { prescriptionId: firstId, items: [item('Amoxicillin'), item('Paracetamol')], advice: 'Add a second drug.' },
      drA.userId
    );
    check('replacing issues a new prescription', replaced.success && replaced.result?.items.length === 2, replaced.errors);
    check('the replacement belongs to the same encounter', replaced.result?.encounterId === openEncounter);

    const original = await Prescription.findById(firstId).lean<{ supersededBy?: mongoose.Types.ObjectId } | null>();
    check('the original is stamped as superseded by the replacement', String(original?.supersededBy) === replaced.result?.prescriptionId);

    const replaceAgain = await prescriptions.supersede({ prescriptionId: firstId, items: [item('Amoxicillin')], advice: '' }, drA.userId);
    check('an already-replaced prescription cannot be replaced again', !replaceAgain.success, replaceAgain.errors);

    console.log('\nReads — the encounter list, the doctor list, the enriched detail');
    const forEncounter = await prescriptions.listForEncounter(openEncounter);
    check(
      'both prescriptions are on the encounter, newest first',
      forEncounter.result.length === 2 && forEncounter.result[0]?.prescriptionId === replaced.result?.prescriptionId,
      forEncounter.result
    );

    const forDoctor = await prescriptions.listForDoctor(drA.doctorId);
    check(
      'the doctor list is enriched with names',
      forDoctor.result.length === 2 &&
        forDoctor.result.every(row => row.patientName === `Patient p ${SUFFIX}` && row.doctorName === `Dr aa ${SUFFIX}`),
      forDoctor.result
    );

    const detail = await prescriptions.getDetail(replaced.result?.prescriptionId ?? '');
    check(
      'the detail names the patient and the prescriber',
      detail.result?.patientName === `Patient p ${SUFFIX}` &&
        detail.result?.doctorName === `Dr aa ${SUFFIX}` &&
        detail.result?.doctorRegistrationNo === `REG-aa-${SUFFIX}`,
      detail.result
    );

    const missing = await prescriptions.getDetail(String(new mongoose.Types.ObjectId()));
    check('a missing prescription is a not-found, not a crash', !missing.success);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const doctors = await Doctor.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const doctorIds = doctors.map(doctor => doctor._id);
    const patientIds = patients.map(patient => patient._id);

    const removedPrescriptions = await Prescription.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Encounter.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Appointment.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedPrescriptions.deletedCount} prescription(s), ${removedUsers.deletedCount} user(s)`);
    check(
      'nothing this run created is left behind',
      (await User.countDocuments({ email: emailPattern })) === 0 && (await Prescription.countDocuments({ doctor: { $in: doctorIds } })) === 0
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
