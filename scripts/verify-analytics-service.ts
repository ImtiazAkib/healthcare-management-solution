import mongoose from 'mongoose';

import { Appointment, Department, Doctor, Encounter, Invoice, LabOrder, LabReport, Patient, User } from '@/models';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { LAB_STATUSES } from '@/constants/lab.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { AnalyticsService } from '@/lib/services';
import { toCalendarDate } from '@/lib/utils';

/*
  Exercises AnalyticsService against a real database, then removes what it made.

  The substance is the acceptance's core: each metric the service **aggregates in the database** is
  checked against a figure computed **independently** here (by a different method — countDocuments and
  in-memory sums against the service's `$group`/`$lookup`), so the two agreeing is real evidence the
  aggregation is right rather than the same query run twice; the **date range flows through** (a window
  that excludes the fixtures drops them); and **no patient name or record number** appears anywhere in
  the result, though a doctor and a department — who are staff — do.

  Both computations see the same data (fixtures plus whatever the database already holds), so equality
  holds only if the service's aggregation matches the independent count. Fixtures carry a run-scoped
  suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();
const PATIENT_NAME = `PatientName-${SUFFIX}`;

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

function boundsFor(from: string, to: string): { fromDate: Date; toExclusive: Date } {
  const fromDate = new Date(`${from}T00:00:00.000`);
  const toExclusive = new Date(`${to}T00:00:00.000`);
  toExclusive.setDate(toExclusive.getDate() + 1);
  return { fromDate, toExclusive };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([
    Appointment.createIndexes(),
    Encounter.createIndexes(),
    Invoice.createIndexes(),
    LabReport.createIndexes(),
    Patient.createIndexes(),
  ]);

  const analytics = new AnalyticsService();

  const today = new Date();
  const dayString = toCalendarDate(today);
  const from = toCalendarDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));
  const to = toCalendarDate(new Date(today.getTime() + 24 * 60 * 60 * 1000));
  const { fromDate, toExclusive } = boundsFor(from, to);

  const created: { patientIds: mongoose.Types.ObjectId[]; userIds: mongoose.Types.ObjectId[] } = { patientIds: [], userIds: [] };

  try {
    const department = await Department.create({ name: `Cardiology ${SUFFIX}`, code: `CAR${SUFFIX}`.slice(0, 12) });
    const doctorUser = await User.create({
      name: `DoctorName-${SUFFIX}`,
      email: email('doc'),
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const doctor = await Doctor.create({
      user: doctorUser._id,
      department: department._id,
      specialization: 'General',
      registrationNo: `REG-${SUFFIX}`,
      consultationFee: 0,
    });
    const patientUser = await User.create({
      name: PATIENT_NAME,
      email: email('pt'),
      role: USER_ROLES.PATIENT,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    mrnCounter += 1;
    const mrn = `HMS-2095-${String(mrnCounter).padStart(6, '0')}`;
    const patient = await Patient.create({ user: patientUser._id, medicalRecordNo: mrn });
    created.userIds.push(doctorUser._id, patientUser._id);
    created.patientIds.push(patient._id);

    // Two completed appointments (one checked in 20 minutes before its encounter), one no-show.
    const checkedInAt = new Date(today.getTime() - 20 * 60 * 1000);
    const appointmentA = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      date: dayString,
      startTime: '09:00',
      endTime: '09:20',
      status: APPOINTMENT_STATUSES.COMPLETED,
      checkedInAt,
      completedAt: today,
      bookedBy: doctorUser._id,
    });
    await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      date: dayString,
      startTime: '09:20',
      endTime: '09:40',
      status: APPOINTMENT_STATUSES.COMPLETED,
      completedAt: today,
      bookedBy: doctorUser._id,
    });
    await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      date: dayString,
      startTime: '09:40',
      endTime: '10:00',
      status: APPOINTMENT_STATUSES.NO_SHOW,
      bookedBy: doctorUser._id,
    });

    await Encounter.create({
      appointment: appointmentA._id,
      patient: patient._id,
      doctor: doctor._id,
      status: ENCOUNTER_STATUSES.COMPLETED,
      completedAt: today,
    });
    await Encounter.create({
      appointment: new mongoose.Types.ObjectId(),
      patient: patient._id,
      doctor: doctor._id,
      status: ENCOUNTER_STATUSES.COMPLETED,
      completedAt: today,
    });

    const labOrder = await LabOrder.create({
      encounter: appointmentA._id,
      patient: patient._id,
      orderedBy: doctor._id,
      status: LAB_STATUSES.RELEASED,
      tests: [{ code: `T${SUFFIX}`.slice(0, 12), name: 'Test' }],
    });
    // Released just now — after the order was created, so the turnaround reads positive.
    await LabReport.create({
      labOrder: labOrder._id,
      patient: patient._id,
      performedBy: doctorUser._id,
      verifiedBy: doctorUser._id,
      releasedAt: new Date(),
      file: { storageKey: 'x', fileName: 'r.pdf', mimeType: 'application/pdf', size: 1 },
    });

    await Invoice.create({
      patient: patient._id,
      lines: [
        { serviceCode: 'C', description: 'Consult', category: 'consultation', unitPriceMinorUnits: 50000, quantity: 1, lineTotalMinorUnits: 50000 },
      ],
      subtotalMinorUnits: 50000,
      discountMinorUnits: 0,
      taxMinorUnits: 0,
      totalMinorUnits: 50000,
      paidMinorUnits: 20000,
      status: 'partial',
      issuedBy: doctorUser._id,
      issuedAt: today,
    });

    const result = await analytics.getOverview({ from, to });
    check('the overview computes', result.success, result.errors);
    const overview = result.result;

    if (!overview) {
      throw new Error('No overview to check.');
    }

    console.log('Each metric matches an independent count over the same window');

    // appointmentsByStatus — independent per-status countDocuments vs the service's $group.
    for (const status of [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.NO_SHOW]) {
      const independent = await Appointment.countDocuments({ date: { $gte: from, $lte: to }, status });
      const fromService = overview.appointmentsByStatus.find(row => row.status === status)?.count ?? 0;
      check(`appointments in status "${status}" match (${independent})`, fromService === independent, { fromService, independent });
    }

    // attendance — attended equals the completed count.
    const completedCount = await Appointment.countDocuments({ date: { $gte: from, $lte: to }, status: APPOINTMENT_STATUSES.COMPLETED });
    check('attended matches the completed count', overview.attendance.attended === completedCount, {
      attended: overview.attendance.attended,
      completedCount,
    });

    // consultationsByDoctor — this doctor's row matches an independent encounter count.
    const doctorConsults = await Encounter.countDocuments({
      doctor: doctor._id,
      status: ENCOUNTER_STATUSES.COMPLETED,
      completedAt: { $gte: fromDate, $lt: toExclusive },
    });
    const doctorRow = overview.consultationsByDoctor.find(row => row.id === String(doctor._id));
    check('this doctor’s consultation count matches independently', doctorRow?.count === doctorConsults, { row: doctorRow?.count, doctorConsults });
    check('the doctor breakdown names the doctor (staff, not a patient)', doctorRow?.name === `DoctorName-${SUFFIX}`);

    // consultationsByDepartment — this department's row matches.
    const deptRow = overview.consultationsByDepartment.find(row => row.id === String(department._id));
    check('this department’s consultation count matches', deptRow?.count === doctorConsults, { row: deptRow?.count, doctorConsults });

    // averageWaitMinutes — independent avg over checked-in appointments joined to their encounters.
    const waited = await Appointment.aggregate<{ waitMs: number }>([
      { $match: { date: { $gte: from, $lte: to }, checkedInAt: { $ne: null } } },
      { $lookup: { from: 'encounters', localField: '_id', foreignField: 'appointment', as: 'e' } },
      { $unwind: '$e' },
      { $project: { waitMs: { $subtract: ['$e.createdAt', '$checkedInAt'] } } },
      { $match: { waitMs: { $gte: 0 } } },
    ]);
    const independentWait = waited.length > 0 ? Math.round(waited.reduce((sum, row) => sum + row.waitMs, 0) / waited.length / 60000) : null;
    check('the average wait matches an independent computation', overview.averageWaitMinutes === independentWait, {
      service: overview.averageWaitMinutes,
      independentWait,
    });

    // revenue — independent find + JS sum vs the service's $group.
    const invoicesInWindow = await Invoice.find({ issuedAt: { $gte: fromDate, $lt: toExclusive }, status: { $ne: 'void' } })
      .select('totalMinorUnits paidMinorUnits')
      .lean();
    const billed = invoicesInWindow.reduce((sum, invoice) => sum + invoice.totalMinorUnits, 0);
    const collected = invoicesInWindow.reduce((sum, invoice) => sum + invoice.paidMinorUnits, 0);
    check('revenue billed matches an independent sum', overview.revenue.billedMinorUnits === billed, {
      service: overview.revenue.billedMinorUnits,
      billed,
    });
    check('revenue collected matches an independent sum', overview.revenue.collectedMinorUnits === collected, {
      service: overview.revenue.collectedMinorUnits,
      collected,
    });

    // newPatients + lab released — independent counts.
    const independentNewPatients = await Patient.countDocuments({ createdAt: { $gte: fromDate, $lt: toExclusive } });
    check('new patients matches an independent count', overview.newPatients === independentNewPatients, {
      service: overview.newPatients,
      independentNewPatients,
    });
    const independentReleased = await LabReport.countDocuments({ releasedAt: { $gte: fromDate, $lt: toExclusive } });
    check('lab reports released matches an independent count', overview.labReleasedCount === independentReleased, {
      service: overview.labReleasedCount,
      independentReleased,
    });

    console.log('\nNo patient identity — the result names no patient');
    const serialized = JSON.stringify(overview);
    check('the patient name does not appear anywhere in the overview', !serialized.includes(PATIENT_NAME));
    check('the medical record number does not appear anywhere in the overview', !serialized.includes(mrn));

    console.log('\nThe date range flows through — a window before the fixtures drops them');
    const pastFrom = toCalendarDate(new Date(today.getTime() - 400 * 24 * 60 * 60 * 1000));
    const pastTo = toCalendarDate(new Date(today.getTime() - 380 * 24 * 60 * 60 * 1000));
    const pastBounds = boundsFor(pastFrom, pastTo);
    const past = await analytics.getOverview({ from: pastFrom, to: pastTo });
    const pastIndependentNew = await Patient.countDocuments({ createdAt: { $gte: pastBounds.fromDate, $lt: pastBounds.toExclusive } });
    check(
      'the past window shows a different, independently-matching new-patient count',
      past.result?.newPatients === pastIndependentNew && past.result?.newPatients !== overview.newPatients,
      {
        past: past.result?.newPatients,
        now: overview.newPatients,
      }
    );
  } finally {
    console.log('\nCleaning up');
    await Encounter.deleteMany({ patient: { $in: created.patientIds } });
    await Appointment.deleteMany({ patient: { $in: created.patientIds } });
    const labOrders = await LabOrder.find({ patient: { $in: created.patientIds } })
      .select('_id')
      .lean();
    await LabReport.deleteMany({ labOrder: { $in: labOrders.map(order => order._id) } });
    await LabOrder.deleteMany({ patient: { $in: created.patientIds } });
    await Invoice.deleteMany({ patient: { $in: created.patientIds } });
    await Doctor.deleteMany({ user: { $in: created.userIds } });
    await Patient.deleteMany({ _id: { $in: created.patientIds } });
    await Department.deleteMany({ name: new RegExp(SUFFIX) });
    const removed = await User.deleteMany({ _id: { $in: created.userIds } });

    console.log(`  removed ${removed.deletedCount} user(s)`);
    check('nothing this run created is left behind', (await User.countDocuments({ email: new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i') })) === 0);

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
