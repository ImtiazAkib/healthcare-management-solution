import mongoose from 'mongoose';

import { Appointment, Department, Doctor, Encounter, Patient, User } from '@/models';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { EncounterService, MedicalRecordService } from '@/lib/services';

import type { AppointmentStatus, SessionUser } from '@/types';

/*
  Exercises EncounterService and MedicalRecordService against a real database, then removes what it
  made.

  The substance is the two rules the screen cannot vouch for: **access is by relationship** — a
  doctor with no appointment or encounter linking them to a patient is refused the record even by
  guessing its id — and a completed encounter is **append-only**, corrected by a dated addendum and
  never overwritten. The one transition (open → in-consultation, complete → completed) is checked
  to land on the appointment behind it.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-emr-${SUFFIX}`;
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

const session = (userId: string): SessionUser => ({ userId, role: USER_ROLES.DOCTOR, email: 'doc@example.test', name: 'Doctor', isApproved: true });

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

async function seedAppointment(
  doctorId: string,
  patientId: string,
  departmentId: string,
  status: AppointmentStatus,
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
    status,
    bookedBy: new mongoose.Types.ObjectId(),
    ...(status === APPOINTMENT_STATUSES.CHECKED_IN ? { tokenNo: 1, checkedInAt: new Date() } : {}),
  });

  return String(appointment._id);
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([Appointment.createIndexes(), Encounter.createIndexes(), Doctor.createIndexes(), Patient.createIndexes(), User.createIndexes()]);

  const encounters = new EncounterService();
  const records = new MedicalRecordService();

  try {
    const drA = await seedDoctor('aa');
    const drB = await seedDoctor('bb');
    const patient = await seedPatient('p');
    const sessionA = session(drA.userId);
    const sessionB = session(drB.userId);

    const appointment = await seedAppointment(drA.doctorId, patient, drA.departmentId, APPOINTMENT_STATUSES.CHECKED_IN);

    console.log('Open — from a checked-in appointment, moving it into consultation');
    const opened = await encounters.open({ appointmentId: appointment, chiefComplaint: 'Cough' }, sessionA);
    check('an encounter opens from a checked-in appointment', opened.success && opened.result?.status === ENCOUNTER_STATUSES.OPEN, opened.errors);
    check(
      'the patient and doctor are derived from the appointment',
      opened.result?.patientId === patient && opened.result?.doctorId === drA.doctorId
    );

    const appointmentAfterOpen = await Appointment.findById(appointment).lean<{ status: string } | null>();
    check('opening moved the appointment into consultation', appointmentAfterOpen?.status === APPOINTMENT_STATUSES.IN_CONSULTATION);

    const openAgain = await encounters.open({ appointmentId: appointment, chiefComplaint: '' }, sessionA);
    check('a second open on the same appointment is refused', !openAgain.success, openAgain.errors);

    console.log('\nAccess — by relationship, not by role');
    const encounterId = opened.result?.encounterId ?? '';
    const viewByOwner = await encounters.getById(encounterId, sessionA);
    check('the owning doctor can view the encounter', viewByOwner.success, viewByOwner.errors);
    const viewByStranger = await encounters.getById(encounterId, sessionB);
    check('an unrelated doctor cannot view the encounter (guessed id refused)', !viewByStranger.success, viewByStranger.errors);

    const timelineStranger = await records.getPatientTimeline(patient, sessionB);
    check('an unrelated doctor cannot open the patient timeline', !timelineStranger.success, timelineStranger.errors);
    const detailStranger = await records.getPatientForDoctor(patient, sessionB);
    check('an unrelated doctor cannot open the patient record', !detailStranger.success);

    console.log('\nEdit while open, then the append-only lock on completion');
    const edited = await encounters.update(
      {
        encounterId,
        chiefComplaint: 'Cough, 3 days',
        examination: 'Chest clear',
        diagnoses: [{ description: 'Common cold' }],
        treatmentNotes: 'Rest',
        followUpDate: '',
      },
      sessionA
    );
    check(
      'the open encounter can be edited by its doctor',
      edited.success && edited.result?.diagnoses[0]?.description === 'Common cold',
      edited.errors
    );

    const editByStranger = await encounters.update({ encounterId, chiefComplaint: 'hijack', diagnoses: [] }, sessionB);
    check('another doctor cannot edit the encounter', !editByStranger.success);

    const completed = await encounters.complete(encounterId, sessionA);
    check('the encounter completes', completed.success && completed.result?.status === ENCOUNTER_STATUSES.COMPLETED, completed.errors);
    const appointmentAfterComplete = await Appointment.findById(appointment).lean<{ status: string } | null>();
    check('completing the encounter completed the appointment', appointmentAfterComplete?.status === APPOINTMENT_STATUSES.COMPLETED);

    const editAfterComplete = await encounters.update({ encounterId, chiefComplaint: 'rewrite', diagnoses: [] }, sessionA);
    check('a completed encounter cannot be edited', !editAfterComplete.success, editAfterComplete.errors);

    const addendum = await encounters.addAddendum({ encounterId, note: 'Advised return if fever persists.' }, sessionA);
    check('a completed encounter takes an addendum', addendum.success && addendum.result?.addenda.length === 1, addendum.errors);
    check('the addendum is attributed to the doctor', addendum.result?.addenda[0]?.addedBy === drA.userId);

    const detail = await encounters.getDetail(encounterId, sessionA);
    check(
      'the record view names the addendum author, not a raw id',
      detail.result?.addenda[0]?.addedByName === `Dr aa ${SUFFIX}`,
      detail.result?.addenda
    );

    const completeAgain = await encounters.complete(encounterId, sessionA);
    check('completing an already-completed encounter is refused', !completeAgain.success);

    console.log('\nThe record facade — my patients, the timeline');
    const myPatients = await records.listMyPatients(sessionA, '');
    check(
      'the doctor sees the patient they have a record with',
      myPatients.result.some(summary => summary.patientId === patient),
      myPatients.result
    );
    const strangerPatients = await records.listMyPatients(sessionB, '');
    check(
      'a doctor with no records sees no patients',
      strangerPatients.result.every(summary => summary.patientId !== patient)
    );

    const timeline = await records.getPatientTimeline(patient, sessionA);
    check(
      'the timeline shows the encounter with the doctor name',
      timeline.result.length === 1 && Boolean(timeline.result[0]?.doctorName),
      timeline.result
    );

    console.log('\nOpen is retry-safe — an in-consultation appointment with no encounter still opens');
    const midVisit = await seedAppointment(drA.doctorId, patient, drA.departmentId, APPOINTMENT_STATUSES.IN_CONSULTATION, '10:00');
    const openedMid = await encounters.open({ appointmentId: midVisit, chiefComplaint: '' }, sessionA);
    check(
      'an in-consultation appointment with no encounter opens',
      openedMid.success && openedMid.result?.status === ENCOUNTER_STATUSES.OPEN,
      openedMid.errors
    );
    const midAfter = await Appointment.findById(midVisit).lean<{ status: string } | null>();
    check('opening it leaves the appointment in consultation, with no spurious move', midAfter?.status === APPOINTMENT_STATUSES.IN_CONSULTATION);
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

    const removedEncounters = await Encounter.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Appointment.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedEncounters.deletedCount} encounter(s), ${removedUsers.deletedCount} user(s)`);
    check(
      'nothing this run created is left behind',
      (await User.countDocuments({ email: emailPattern })) === 0 && (await Encounter.countDocuments({ doctor: { $in: doctorIds } })) === 0
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
