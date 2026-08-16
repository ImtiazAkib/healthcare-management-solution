import mongoose from 'mongoose';

import { Appointment, Availability, Department, Doctor, Encounter, LabOrder, LabReport, Patient, Prescription, User } from '@/models';
import {
  appointmentFromEntity,
  availabilityFromEntity,
  encounterFromEntity,
  labOrderFromEntity,
  labReportFromEntity,
  prescriptionFromEntity,
} from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { LAB_PRIORITIES, LAB_STATUSES } from '@/constants/lab.const';
import { PRESCRIPTION_FREQUENCIES } from '@/constants/prescription.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import {
  AppointmentCreateSchema,
  AvailabilityCreateSchema,
  EncounterUpdateSchema,
  PrescriptionCreateSchema,
  VitalsRecordSchema,
} from '@/lib/schemas';
import { ageInYears, dayOfWeekFor, minutesFromTime, timeFromMinutes, toCalendarDate } from '@/lib/utils';

/*
  Exercises the clinical and scheduling models against a real database, then removes
  everything it made. Separate from `verify:data-model` because that one covers identity and
  this one covers the clinical spine — together they would be one file nobody reads.

  Fixtures are tagged with a run-scoped suffix and the cleanup deletes by that tag.
*/
const TAG = `clinical-${Date.now().toString(36)}`;
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
    Built and awaited before anything is inserted. The double-booking assertion below is
    meaningless against an index that is still being created in the background — it would
    pass for the wrong reason and keep passing until production.
  */
  await Promise.all([
    User.createIndexes(),
    Department.createIndexes(),
    Doctor.createIndexes(),
    Patient.createIndexes(),
    Availability.createIndexes(),
    Appointment.createIndexes(),
    Encounter.createIndexes(),
    Prescription.createIndexes(),
    LabOrder.createIndexes(),
    LabReport.createIndexes(),
  ]);
  console.log('Indexes built.\n');

  try {
    // --- fixtures -----------------------------------------------------------------
    const doctorUser = await User.create({
      name: 'Verify Doctor',
      email: email('doctor'),
      password: 'a long enough password',
      role: USER_ROLES.DOCTOR,
    });
    const nurseUser = await User.create({ name: 'Verify Nurse', email: email('nurse'), password: 'a long enough password', role: USER_ROLES.NURSE });
    const labUser = await User.create({ name: 'Verify Lab', email: email('lab'), password: 'a long enough password', role: USER_ROLES.LAB });
    const patientUser = await User.create({
      name: 'Verify Patient',
      email: email('patient'),
      role: USER_ROLES.PATIENT,
      dateOfBirth: new Date('1990-06-15T00:00:00Z'),
    });

    const department = await Department.create({ name: `Cardiology ${TAG}`, code: `c${TAG.slice(-6)}` });
    const doctor = await Doctor.create({
      user: doctorUser._id,
      department: department._id,
      specialization: 'Cardiology',
      registrationNo: `REG-${TAG}`,
    });
    const patient = await Patient.create({
      user: patientUser._id,
      medicalRecordNo: `HMS-2026-${TAG.slice(-6).replace(/\D/g, '7').padStart(6, '7')}`,
    });

    console.log('Date and time helpers');
    check('toCalendarDate produces a zero-padded YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(toCalendarDate()));
    check('a known date maps to the right weekday', dayOfWeekFor('2026-08-17') === 'monday', dayOfWeekFor('2026-08-17'));
    check('a malformed date maps to nothing rather than guessing', dayOfWeekFor('not-a-date') === null);
    check('minutes round-trip back to the same zero-padded time', timeFromMinutes(minutesFromTime('09:05')) === '09:05');
    check('midnight round-trips', timeFromMinutes(minutesFromTime('00:00')) === '00:00');
    check('an age is whole years', typeof ageInYears(new Date('1990-06-15T00:00:00Z')) === 'number');
    check('no date of birth yields no age rather than zero', ageInYears(null) === null);

    console.log('\nAvailability');
    const availability = await Availability.create({
      doctor: doctor._id,
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 20,
      room: '3',
      effectiveFrom: '2026-01-01',
    });
    check('slotMinutes is stored as given', availability.slotMinutes === 20);

    const backwardsBlock = await refusalFrom(() =>
      Availability.create({ doctor: doctor._id, dayOfWeek: 'monday', startTime: '13:00', endTime: '09:00', effectiveFrom: '2026-01-01' })
    );
    check('a block ending before it starts is refused by the model', backwardsBlock !== null, backwardsBlock);

    const badTime = await refusalFrom(() =>
      Availability.create({ doctor: doctor._id, dayOfWeek: 'monday', startTime: '9:00', endTime: '13:00', effectiveFrom: '2026-01-01' })
    );
    check('an unpadded time (9:00) is refused by the model', badTime !== null, badTime);

    const impossibleTime = await refusalFrom(() =>
      Availability.create({ doctor: doctor._id, dayOfWeek: 'monday', startTime: '10:00', endTime: '24:00', effectiveFrom: '2026-01-01' })
    );
    check('24:00 is refused by the model', impossibleTime !== null, impossibleTime);

    // Set rather than cast — see the note on the invalid status below.
    const badDay = await refusalFrom(() => {
      const draft = new Availability({ doctor: doctor._id, dayOfWeek: 'monday', startTime: '09:00', endTime: '13:00', effectiveFrom: '2026-01-01' });
      draft.set('dayOfWeek', 'someday');

      return draft.save();
    });
    check('a day outside the set is refused', badDay !== null, badDay);

    const availabilityDto = availabilityFromEntity(availability);
    check('availabilityFromEntity keeps the times as strings', availabilityDto.startTime === '09:00' && availabilityDto.endTime === '13:00');
    check('availabilityFromEntity nulls an open-ended block', availabilityDto.effectiveTo === null);

    console.log('\nAppointment — the double-booking index');
    const slot = { date: '2026-08-17', startTime: '09:00', endTime: '09:20' };
    const booking = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      ...slot,
      bookedBy: nurseUser._id,
      status: APPOINTMENT_STATUSES.CONFIRMED,
    });
    check('a booking defaults to routine triage', booking.triagePriority === 'routine');
    check('a booking has no token number until check-in', booking.tokenNo === undefined);

    const doubleBooking = await refusalFrom(() =>
      Appointment.create({ patient: patient._id, doctor: doctor._id, department: department._id, ...slot, bookedBy: nurseUser._id })
    );
    check(
      'a second booking of the same doctor/date/time is refused by the index',
      doubleBooking !== null && /duplicate key/i.test(doubleBooking),
      doubleBooking
    );

    // The point of the partial index: a cancelled appointment gives its slot back.
    booking.status = APPOINTMENT_STATUSES.CANCELLED;
    booking.cancelledAt = new Date();
    await booking.save();

    const rebooking = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      ...slot,
      bookedBy: nurseUser._id,
      status: APPOINTMENT_STATUSES.CONFIRMED,
    });
    check('cancelling frees the slot for somebody else', Boolean(rebooking._id));

    const sameTimeOtherDay = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      date: '2026-08-18',
      startTime: '09:00',
      endTime: '09:20',
      bookedBy: nurseUser._id,
    });
    check('the same time on another day is not a clash', Boolean(sameTimeOtherDay._id));

    const missingDoctor = await refusalFrom(() =>
      Appointment.create({ patient: patient._id, department: department._id, ...slot, date: '2026-09-01', bookedBy: nurseUser._id })
    );
    check('an appointment without a doctor is refused', missingDoctor !== null, missingDoctor);

    const missingPatient = await refusalFrom(() =>
      Appointment.create({ doctor: doctor._id, department: department._id, ...slot, date: '2026-09-02', bookedBy: nurseUser._id })
    );
    check('an appointment without a patient is refused', missingPatient !== null, missingPatient);

    /*
      Written through `set` rather than passed to `create`, because the compiler is right to
      refuse `'maybe'` as a status — and casting around it would be exactly the unchecked
      cast this project bans. `set` takes a path and a value, which is how a request that
      never saw the types would arrive, and it still runs the model's validation on save.
    */
    const badStatus = await refusalFrom(() => {
      const draft = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        department: department._id,
        ...slot,
        date: '2026-09-03',
        bookedBy: nurseUser._id,
      });
      draft.set('status', 'maybe');

      return draft.save();
    });
    check('a status outside the set is refused', badStatus !== null, badStatus);

    console.log('\nAppointment — vitals ride here, not on the encounter');
    rebooking.status = APPOINTMENT_STATUSES.CHECKED_IN;
    rebooking.tokenNo = 1;
    rebooking.checkedInAt = new Date();
    rebooking.vitals = { systolic: 118, diastolic: 76, pulse: 72, temperature: 36.8, recordedBy: nurseUser._id, recordedAt: new Date() };
    await rebooking.save();

    const withVitals = await Appointment.findById(rebooking._id);
    check('vitals are stored on the appointment', withVitals?.vitals?.pulse === 72);
    check('vitals carry who recorded them', Boolean(withVitals?.vitals?.recordedBy));

    const impossibleTemperature = await refusalFrom(async () => {
      const target = await Appointment.findById(sameTimeOtherDay._id);
      if (target) {
        target.vitals = { temperature: 986, recordedBy: nurseUser._id, recordedAt: new Date() };
        await target.save();
      }
    });
    check('a temperature of 986 is refused by the model', impossibleTemperature !== null, impossibleTemperature);

    const appointmentDto = appointmentFromEntity(withVitals ?? rebooking);
    check('appointmentFromEntity renders vitals with an ISO timestamp', typeof appointmentDto.vitals?.recordedAt === 'string');
    check('appointmentFromEntity nulls a reading that was not taken', appointmentDto.vitals?.oxygenSaturation === null);

    console.log('\nEncounter');
    const encounter = await Encounter.create({ appointment: rebooking._id, patient: patient._id, doctor: doctor._id, chiefComplaint: 'Chest pain' });
    check('an encounter opens in the open status', encounter.status === 'open');
    check('diagnoses and addenda default to empty arrays', encounter.diagnoses.length === 0 && encounter.addenda.length === 0);

    const secondEncounter = await refusalFrom(() => Encounter.create({ appointment: rebooking._id, patient: patient._id, doctor: doctor._id }));
    check('one appointment cannot hold two encounters', secondEncounter !== null && /duplicate key/i.test(secondEncounter), secondEncounter);

    encounter.diagnoses = [{ description: 'Stable angina', code: 'I20.9' }];
    encounter.addenda = [{ note: 'Corrected after review.', addedBy: doctorUser._id, addedAt: new Date() }];
    encounter.status = 'completed';
    encounter.completedAt = new Date();
    await encounter.save();

    const encounterDto = encounterFromEntity(encounter);
    check('encounterFromEntity carries the diagnoses', encounterDto.diagnoses[0]?.description === 'Stable angina');
    check('encounterFromEntity carries the addenda in full', encounterDto.addenda.length === 1 && encounterDto.addenda[0].addedAt.endsWith('Z'));

    console.log('\nPrescription');
    const prescription = await Prescription.create({
      encounter: encounter._id,
      patient: patient._id,
      doctor: doctor._id,
      items: [{ drug: 'Aspirin', strength: '75mg', frequency: PRESCRIPTION_FREQUENCIES.ONCE_DAILY, duration: '30 days' }],
    });
    check('a prescription stamps its issue time', prescription.issuedAt instanceof Date);

    const emptyPrescription = await refusalFrom(() =>
      Prescription.create({ encounter: encounter._id, patient: patient._id, doctor: doctor._id, items: [] })
    );
    check('a prescription with no items is refused', emptyPrescription !== null, emptyPrescription);

    // Same reason as the status above: set the invalid value rather than cast around it.
    const badFrequency = await refusalFrom(() => {
      const draft = new Prescription({
        encounter: encounter._id,
        patient: patient._id,
        doctor: doctor._id,
        items: [{ drug: 'Aspirin', frequency: PRESCRIPTION_FREQUENCIES.ONCE_DAILY }],
      });
      draft.set('items.0.frequency', 'whenever');

      return draft.save();
    });
    check('a frequency outside the closed list is refused', badFrequency !== null, badFrequency);

    const prescriptionDto = prescriptionFromEntity(prescription);
    check('prescriptionFromEntity nulls an absent supersession', prescriptionDto.supersededById === null);
    check('prescriptionFromEntity nulls an item field that was not filled', prescriptionDto.items[0].instructions === null);

    console.log('\nLab order and report');
    const labOrder = await LabOrder.create({
      encounter: encounter._id,
      patient: patient._id,
      orderedBy: doctor._id,
      tests: [{ name: 'Lipid profile', code: 'lip' }],
      priority: LAB_PRIORITIES.URGENT,
    });
    check('an order starts as ordered', labOrder.status === LAB_STATUSES.ORDERED);
    check('a test code is upper-cased on write', labOrder.tests[0].code === 'LIP');

    const emptyOrder = await refusalFrom(() => LabOrder.create({ encounter: encounter._id, patient: patient._id, orderedBy: doctor._id, tests: [] }));
    check('an order with no tests is refused', emptyOrder !== null, emptyOrder);

    const report = await LabReport.create({
      labOrder: labOrder._id,
      patient: patient._id,
      performedBy: labUser._id,
      summary: 'Within range.',
      file: { storageKey: 'gridfs-key-123', fileName: 'lipid.pdf', mimeType: 'application/pdf', size: 51_200 },
    });
    check('a report is not released on upload', report.releasedAt === undefined);

    const secondReport = await refusalFrom(() => LabReport.create({ labOrder: labOrder._id, patient: patient._id, performedBy: labUser._id }));
    check('one order cannot hold two reports', secondReport !== null && /duplicate key/i.test(secondReport), secondReport);

    const executableUpload = await refusalFrom(() =>
      LabReport.create({
        labOrder: sameTimeOtherDay._id,
        patient: patient._id,
        performedBy: labUser._id,
        file: { storageKey: 'k', fileName: 'x.exe', mimeType: 'application/octet-stream', size: 10 },
      })
    );
    check('a file type outside the allow-list is refused by the model', executableUpload !== null, executableUpload);

    const releaseWithoutVerifier = await refusalFrom(async () => {
      const target = await LabReport.findById(report._id);
      if (target) {
        target.releasedAt = new Date();
        await target.save();
      }
    });
    check('a report cannot be released without a verifier', releaseWithoutVerifier !== null, releaseWithoutVerifier);

    const released = await LabReport.findById(report._id);
    if (released) {
      released.verifiedBy = labUser._id;
      released.releasedAt = new Date();
      await released.save();
    }

    const labOrderDto = labOrderFromEntity(labOrder);
    check('labOrderFromEntity renders the tests', labOrderDto.tests[0].name === 'Lipid profile');

    const reportDto = labReportFromEntity(released ?? report);
    check('labReportFromEntity carries NO storageKey', !('storageKey' in (reportDto.file ?? {})));
    check('labReportFromEntity carries the file name, type and size', reportDto.file?.fileName === 'lipid.pdf' && reportDto.file?.size === 51_200);
    check('labReportFromEntity derives isReleased', reportDto.isReleased === true);

    console.log('\nSchemas');
    const block = AvailabilityCreateSchema.safeParse({
      doctorId: String(doctor._id),
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: '20',
      effectiveFrom: '2026-01-01',
    });
    check('a valid availability block parses', block.success, block.success ? undefined : block.error.issues);
    check('slotMinutes arrives as a number', block.success && block.data.slotMinutes === 20);
    check('re-parsing the block output succeeds', block.success && AvailabilityCreateSchema.safeParse(block.data).success);

    const backwards = AvailabilityCreateSchema.safeParse({
      doctorId: String(doctor._id),
      dayOfWeek: 'monday',
      startTime: '13:00',
      endTime: '09:00',
      slotMinutes: 20,
      effectiveFrom: '2026-01-01',
    });
    check(
      'the schema refuses a backwards block on the endTime field',
      !backwards.success && backwards.error.issues.some(x => x.path.includes('endTime'))
    );

    const unpadded = AppointmentCreateSchema.safeParse({
      patientId: String(patient._id),
      doctorId: String(doctor._id),
      departmentId: String(department._id),
      date: '2026-08-17',
      startTime: '9:00',
      endTime: '09:20',
    });
    check('the schema refuses an unpadded time', !unpadded.success);

    const selfBooked = AppointmentCreateSchema.safeParse({
      patientId: String(patient._id),
      doctorId: String(doctor._id),
      departmentId: String(department._id),
      date: '2026-08-17',
      startTime: '09:00',
      endTime: '09:20',
      status: APPOINTMENT_STATUSES.COMPLETED,
      tokenNo: 1,
    });
    check(
      'a caller cannot book itself straight into a status or a token',
      selfBooked.success && !('status' in selfBooked.data) && !('tokenNo' in selfBooked.data),
      selfBooked.success ? selfBooked.data : selfBooked.error.issues
    );

    const blankVitals = VitalsRecordSchema.safeParse({ appointmentId: String(rebooking._id), pulse: '72', temperature: '', systolic: '' });
    check(
      'a blank vitals box is absent rather than zero',
      blankVitals.success && blankVitals.data.temperature === undefined && blankVitals.data.pulse === 72,
      blankVitals.success ? blankVitals.data : blankVitals.error.issues
    );

    const wildVitals = VitalsRecordSchema.safeParse({ appointmentId: String(rebooking._id), temperature: 986 });
    check('the schema refuses an impossible temperature', !wildVitals.success);

    const blankDiagnoses = EncounterUpdateSchema.safeParse({
      encounterId: String(encounter._id),
      diagnoses: [
        { description: 'Stable angina', code: '' },
        { description: '', code: '' },
      ],
    });
    check(
      'blank diagnosis rows are dropped',
      blankDiagnoses.success && blankDiagnoses.data.diagnoses?.length === 1,
      blankDiagnoses.success ? blankDiagnoses.data.diagnoses : blankDiagnoses.error.issues
    );

    const noItems = PrescriptionCreateSchema.safeParse({ encounterId: String(encounter._id), items: [] });
    check('the schema refuses a prescription with no items', !noItems.success);

    const halfFilledItem = PrescriptionCreateSchema.safeParse({
      encounterId: String(encounter._id),
      items: [{ drug: '', frequency: PRESCRIPTION_FREQUENCIES.ONCE_DAILY }],
    });
    check('a half-filled drug row is refused rather than dropped', !halfFilledItem.success);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${TAG}@example\\.test$`);
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(x => x._id);

    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(x => x._id);
    const doctors = await Doctor.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const doctorIds = doctors.map(x => x._id);

    const removed = {
      labReports: (await LabReport.deleteMany({ patient: { $in: patientIds } })).deletedCount,
      labOrders: (await LabOrder.deleteMany({ patient: { $in: patientIds } })).deletedCount,
      prescriptions: (await Prescription.deleteMany({ patient: { $in: patientIds } })).deletedCount,
      encounters: (await Encounter.deleteMany({ patient: { $in: patientIds } })).deletedCount,
      appointments: (await Appointment.deleteMany({ patient: { $in: patientIds } })).deletedCount,
      availability: (await Availability.deleteMany({ doctor: { $in: doctorIds } })).deletedCount,
      doctors: (await Doctor.deleteMany({ _id: { $in: doctorIds } })).deletedCount,
      patients: (await Patient.deleteMany({ _id: { $in: patientIds } })).deletedCount,
      departments: (await Department.deleteMany({ name: new RegExp(TAG) })).deletedCount,
      users: (await User.deleteMany({ _id: { $in: userIds } })).deletedCount,
    };

    console.log(
      `  removed ${Object.entries(removed)
        .map(([key, count]) => `${count} ${key}`)
        .join(', ')}`
    );

    const leftBehind = (await User.countDocuments({ email: emailPattern })) + (await Appointment.countDocuments({ patient: { $in: patientIds } }));
    check('nothing this run created is left behind', leftBehind === 0, `${leftBehind} document(s) remain`);

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
