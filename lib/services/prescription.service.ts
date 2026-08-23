import { Doctor } from '@/models/doctor.model';
import { Encounter } from '@/models/encounter.model';
import { Patient } from '@/models/patient.model';
import { Prescription } from '@/models/prescription.model';
import { User } from '@/models/user.model';
import { Gender, PrescriptionDto, prescriptionFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure, singleSuccess } from '@/lib/result';
import type { PrescriptionCreateOutput, PrescriptionSupersedeOutput } from '@/lib/schemas';
import { toId } from '@/lib/utils';

import type { DoctorEntity } from '@/models/doctor.model';
import type { EncounterEntity } from '@/models/encounter.model';
import type { PatientEntity } from '@/models/patient.model';
import type { PrescriptionEntity } from '@/models/prescription.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('prescription.service');

const DATABASE = CODES.DATABASE.PRESCRIPTIONS;
const VALIDATION = CODES.VALIDATION.PRESCRIPTIONS;
const BUSINESS = CODES.BUSINESS.PRESCRIPTIONS;

// A doctor's prescription list is bounded — the recent scripts, newest first.
const LIST_LIMIT = 100;

/** A prescription with the names a list shows, so a row needs no second query. */
export type PrescriptionRow = PrescriptionDto & {
  patientName: string;
  medicalRecordNo: string;
  doctorName: string;
};

/** A prescription with everything the detail and print sheet name — patient identity and prescriber. */
export type PrescriptionDetail = PrescriptionDto & {
  patientName: string;
  medicalRecordNo: string;
  patientDateOfBirth: string | null;
  patientGender: Gender | null;
  doctorName: string;
  doctorRegistrationNo: string;
  doctorSpecialization: string;
  doctorDesignation: string | null;
};

/*
  Prescriptions — written during a visit, and immutable once issued.

  Two rules carry the weight, both here because a Server Action is a public endpoint the screen
  cannot vouch for:

  - **A prescription hangs off the doctor's own open encounter.** The patient and the doctor are
    derived from that encounter, never sent — a prescription that named its own patient is one
    anybody could write for anybody — and a doctor writing into a stranger's encounter, or into a
    completed one, is refused.
  - **Immutable once issued.** The pharmacy may already have dispensed against it, so it is never
    edited: a change is a **new** prescription that supersedes the old, and both stay on the
    timeline. `supersededBy` is the only write an existing prescription ever takes.
*/
export class PrescriptionService {
  /**
   * Issue a prescription against the requester's own open encounter.
   *
   * The patient and doctor are taken from the encounter, never the request. The encounter must be
   * open — the script is written during the visit — and must be the requester's own.
   *
   * @param input - Validated create input (an encounter id, the items, optional advice).
   * @param byUserId - The signed-in doctor's account id.
   *
   * @returns The issued prescription, or a failure.
   */
  public async issue(input: PrescriptionCreateOutput, byUserId: string): Promise<SingleResult<PrescriptionDto>> {
    try {
      await connectToDatabase();

      const guard = await this.loadIssuableEncounter(input.encounterId, byUserId);
      if (!('encounter' in guard)) {
        return guard;
      }

      const created = await Prescription.create({
        encounter: guard.encounter._id,
        patient: guard.encounter.patient,
        doctor: guard.encounter.doctor,
        items: input.items.map(item => this.normalizeItem(item)),
        advice: this.optionalText(input.advice),
        // issuedAt defaults to now — a prescription is issued the moment it is created.
      });

      return singleSuccess(prescriptionFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Issuing a prescription failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Replace an issued prescription — the only way to "edit" one.
   *
   * A new prescription is issued against the same encounter (re-running every issue guard), and the
   * old one is stamped `supersededBy`. Both remain readable. A prescription already replaced cannot
   * be replaced again — the chain is corrected from its current end.
   *
   * @param input - Validated supersede input — the prescription to replace and the new items.
   * @param byUserId - The signed-in doctor's account id.
   *
   * @returns The new prescription, or a failure.
   */
  public async supersede(input: PrescriptionSupersedeOutput, byUserId: string): Promise<SingleResult<PrescriptionDto>> {
    try {
      await connectToDatabase();

      const existing = await Prescription.findById(input.prescriptionId).lean<PrescriptionEntity | null>();

      if (!existing) {
        return this.notFound();
      }

      if (existing.supersededBy) {
        return singleFailure(createError(BUSINESS.PRESCRIPTION_ALREADY_SUPERSEDED.CODE, BUSINESS.PRESCRIPTION_ALREADY_SUPERSEDED.MESSAGE));
      }

      // The replacement belongs to the same encounter as the original — the request cannot redirect
      // it onto a different record. The encounter is re-checked for open + ownership all the same.
      const guard = await this.loadIssuableEncounter(toId(existing.encounter), byUserId);
      if (!('encounter' in guard)) {
        return guard;
      }

      const created = await Prescription.create({
        encounter: guard.encounter._id,
        patient: guard.encounter.patient,
        doctor: guard.encounter.doctor,
        items: input.items.map(item => this.normalizeItem(item)),
        advice: this.optionalText(input.advice),
      });

      /*
        The stamp is the guard, not the earlier read: it links the original to the replacement only
        while the original still has no replacement (`supersededBy` absent). The filter is what makes
        two concurrent replaces safe — the first wins the compare-and-set, the second matches nothing.
        Without it both would pass the read above, both create a replacement, and the record would
        carry two live scripts for one change.
      */
      const stamped = await Prescription.findOneAndUpdate(
        { _id: input.prescriptionId, supersededBy: { $exists: false } },
        { supersededBy: created._id },
        { returnDocument: 'after' }
      ).lean<PrescriptionEntity | null>();

      /*
        No match means this replacement never linked — a concurrent replace won the race, or the
        original vanished. Either way roll the new one back: immutability protects an *issued*
        prescription, and this one never was — it was returned to no one, so nothing could have
        dispensed against it. Then report the accurate reason.
      */
      if (!stamped) {
        await Prescription.deleteOne({ _id: created._id });

        const originalStillExists = await Prescription.exists({ _id: input.prescriptionId });

        return originalStillExists
          ? singleFailure(createError(BUSINESS.PRESCRIPTION_ALREADY_SUPERSEDED.CODE, BUSINESS.PRESCRIPTION_ALREADY_SUPERSEDED.MESSAGE))
          : this.notFound();
      }

      return singleSuccess(prescriptionFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Superseding a prescription failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * The prescriptions written in one encounter, newest first — the encounter screen's list.
   *
   * @param encounterId - The encounter.
   *
   * @returns The prescriptions, newest first.
   */
  public async listForEncounter(encounterId: string): Promise<ListResult<PrescriptionDto>> {
    try {
      await connectToDatabase();

      const prescriptions = await Prescription.find({ encounter: encounterId }).sort({ issuedAt: -1 }).lean<PrescriptionEntity[]>();

      return listSuccess(prescriptions.map(prescription => prescriptionFromEntity(prescription)));
    } catch (error) {
      log.error({ err: error }, 'Listing prescriptions for an encounter failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * A doctor's recent prescriptions, newest first, enriched with the patient's name and record
   * number so the list needs no second query.
   *
   * @param doctorId - The doctor whose scripts to list.
   *
   * @returns The prescriptions as rows.
   */
  public async listForDoctor(doctorId: string): Promise<ListResult<PrescriptionRow>> {
    try {
      await connectToDatabase();

      const prescriptions = await Prescription.find({ doctor: doctorId }).sort({ issuedAt: -1 }).limit(LIST_LIMIT).lean<PrescriptionEntity[]>();
      const rows = await this.enrich(prescriptions);

      return listSuccess(rows);
    } catch (error) {
      log.error({ err: error }, 'Listing prescriptions for a doctor failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One prescription with everything the detail page and the print sheet name: the patient's
   * identity and the prescriber's, joined from their records and accounts.
   *
   * Who may read it is the route's to decide — this does not itself ask who is asking.
   *
   * @param prescriptionId - The prescription to read.
   *
   * @returns The enriched prescription, or a failure.
   */
  public async getDetail(prescriptionId: string): Promise<SingleResult<PrescriptionDetail>> {
    try {
      await connectToDatabase();

      const prescription = await Prescription.findById(prescriptionId).lean<PrescriptionEntity | null>();

      if (!prescription) {
        return this.notFound();
      }

      const [patient, doctor] = await Promise.all([
        Patient.find({ _id: prescription.patient })
          .select('_id user medicalRecordNo')
          .lean<Pick<PatientEntity, '_id' | 'user' | 'medicalRecordNo'>[]>()
          .then(list => list[0] ?? null),
        Doctor.find({ _id: prescription.doctor })
          .select('_id user registrationNo specialization designation')
          .lean<Pick<DoctorEntity, '_id' | 'user' | 'registrationNo' | 'specialization' | 'designation'>[]>()
          .then(list => list[0] ?? null),
      ]);

      const accountIds = [patient?.user, doctor?.user].filter((id): id is NonNullable<typeof id> => Boolean(id));
      const accounts = await User.find({ _id: { $in: accountIds } })
        .select('_id name gender dateOfBirth')
        .lean<Pick<UserEntity, '_id' | 'name' | 'gender' | 'dateOfBirth'>[]>();
      const accountById = new Map(accounts.map(account => [toId(account._id), account]));

      const patientAccount = patient ? accountById.get(toId(patient.user)) : undefined;
      const doctorAccount = doctor ? accountById.get(toId(doctor.user)) : undefined;

      const detail: PrescriptionDetail = {
        ...prescriptionFromEntity(prescription),
        patientName: patientAccount?.name ?? '—',
        medicalRecordNo: patient?.medicalRecordNo ?? '—',
        patientDateOfBirth: patientAccount?.dateOfBirth ? patientAccount.dateOfBirth.toISOString() : null,
        patientGender: patientAccount?.gender ?? null,
        doctorName: doctorAccount?.name ?? '—',
        doctorRegistrationNo: doctor?.registrationNo ?? '—',
        doctorSpecialization: doctor?.specialization ?? '—',
        doctorDesignation: doctor?.designation ?? null,
      };

      return singleSuccess(detail);
    } catch (error) {
      log.error({ err: error }, 'Reading a prescription failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Load an encounter a prescription may be written against — it exists, it is open, and it is the
   * requester's own. Returns the encounter or the failure to return.
   *
   * @param encounterId - The encounter.
   * @param byUserId - The signed-in doctor's account id.
   *
   * @returns `{ encounter }` when issuable, or a `SingleResult` failure.
   */
  private async loadIssuableEncounter(
    encounterId: string,
    byUserId: string
  ): Promise<{ encounter: EncounterEntity } | SingleResult<PrescriptionDto>> {
    const encounter = await Encounter.findById(encounterId).lean<EncounterEntity | null>();

    if (!encounter) {
      return singleFailure(createError(VALIDATION.ENCOUNTER_NOT_FOUND.CODE, VALIDATION.ENCOUNTER_NOT_FOUND.MESSAGE));
    }

    const doctor = await Doctor.findOne({ user: byUserId }).select('_id').lean<Pick<DoctorEntity, '_id'> | null>();

    if (!doctor) {
      return singleFailure(createError(VALIDATION.NO_DOCTOR_PROFILE.CODE, VALIDATION.NO_DOCTOR_PROFILE.MESSAGE));
    }

    // The prescriber must be the encounter's own doctor — a script is written into your visit, not another's.
    if (toId(encounter.doctor) !== toId(doctor._id)) {
      return singleFailure(createError(BUSINESS.NOT_YOUR_ENCOUNTER.CODE, BUSINESS.NOT_YOUR_ENCOUNTER.MESSAGE));
    }

    if (encounter.status !== ENCOUNTER_STATUSES.OPEN) {
      return singleFailure(createError(BUSINESS.ENCOUNTER_NOT_OPEN.CODE, BUSINESS.ENCOUNTER_NOT_OPEN.MESSAGE));
    }

    return { encounter };
  }

  /**
   * Attach the patient and doctor names a list shows, joining each prescription's patient (and its
   * account) and doctor (and its account).
   *
   * @param prescriptions - The prescriptions to enrich.
   *
   * @returns The rows, with names.
   */
  private async enrich(prescriptions: PrescriptionEntity[]): Promise<PrescriptionRow[]> {
    if (prescriptions.length === 0) {
      return [];
    }

    const patientIds = [...new Set(prescriptions.map(prescription => toId(prescription.patient)))];
    const doctorIds = [...new Set(prescriptions.map(prescription => toId(prescription.doctor)))];

    const [patients, doctors] = await Promise.all([
      Patient.find({ _id: { $in: patientIds } })
        .select('_id user medicalRecordNo')
        .lean<Pick<PatientEntity, '_id' | 'user' | 'medicalRecordNo'>[]>(),
      Doctor.find({ _id: { $in: doctorIds } })
        .select('_id user')
        .lean<Pick<DoctorEntity, '_id' | 'user'>[]>(),
    ]);

    const accountIds = [...patients.map(patient => patient.user), ...doctors.map(doctor => doctor.user)];
    const accounts = await User.find({ _id: { $in: accountIds } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));

    const patientById = new Map(patients.map(patient => [toId(patient._id), patient]));
    const doctorUserById = new Map(doctors.map(doctor => [toId(doctor._id), toId(doctor.user)]));

    return prescriptions.map(prescription => {
      const dto = prescriptionFromEntity(prescription);
      const patient = patientById.get(dto.patientId);
      const doctorUserId = doctorUserById.get(dto.doctorId);

      return {
        ...dto,
        patientName: patient ? (nameByUserId.get(toId(patient.user)) ?? '—') : '—',
        medicalRecordNo: patient?.medicalRecordNo ?? '—',
        doctorName: doctorUserId ? (nameByUserId.get(doctorUserId) ?? '—') : '—',
      };
    });
  }

  private normalizeItem(item: PrescriptionCreateOutput['items'][number]): {
    drug: string;
    strength?: string;
    dose?: string;
    frequency: PrescriptionCreateOutput['items'][number]['frequency'];
    duration?: string;
    instructions?: string;
  } {
    return {
      drug: item.drug,
      strength: this.optionalText(item.strength),
      dose: this.optionalText(item.dose),
      frequency: item.frequency,
      duration: this.optionalText(item.duration),
      instructions: this.optionalText(item.instructions),
    };
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  private notFound<T>(): SingleResult<T> {
    return singleFailure(createError(VALIDATION.PRESCRIPTION_NOT_FOUND.CODE, VALIDATION.PRESCRIPTION_NOT_FOUND.MESSAGE));
  }
}
