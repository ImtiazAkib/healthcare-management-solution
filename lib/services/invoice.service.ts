import { Encounter } from '@/models/encounter.model';
import { Invoice } from '@/models/invoice.model';
import { Patient } from '@/models/patient.model';
import { ServiceItem } from '@/models/service-item.model';
import { User } from '@/models/user.model';
import { InvoiceDto, SessionUser, invoiceFromEntity } from '@/types';

import { INVOICE_STATUSES, INVOICE_STATUS_FILTERS } from '@/constants/billing.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure, singleSuccess } from '@/lib/result';
import type { InvoiceCreateOutput, InvoiceFiltersOutput, InvoiceVoidOutput } from '@/lib/schemas';
import { escapeRegExp, toId } from '@/lib/utils';

import type { EncounterEntity } from '@/models/encounter.model';
import type { InvoiceAttributes, InvoiceEntity } from '@/models/invoice.model';
import type { PatientEntity } from '@/models/patient.model';
import type { ServiceItemEntity } from '@/models/service-item.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter } from 'mongoose';

const log = createLoggerWithContext('invoice.service');

const DATABASE = CODES.DATABASE.INVOICES;
const VALIDATION = CODES.VALIDATION.INVOICES;
const BUSINESS = CODES.BUSINESS.INVOICES;

// The invoices list is bounded — the counter works recent bills, not the whole ledger at once.
const LIST_LIMIT = 200;

/** One priced line, ready to store — the shape both the entity and the total-computation use. */
type PricedLine = InvoiceAttributes['lines'][number];

/*
  What a visit cost, what is owed, and who may see it.

  The rule that carries the weight: **the server prices everything.** Each line names a catalogue
  service by id and a quantity; the price is looked up and snapshotted here, the subtotal is the sum
  of the lines, and the total is the subtotal less the discount plus the tax — all computed in this
  service, none of it accepted from the client. A tampered total has nowhere to enter, because the
  schema carries no total to tamper with. A line snapshots the code, name and price at issue time, so
  a later catalogue change can never restate a bill already handed over. A void keeps the record and
  its history; nothing here deletes an invoice.
*/
export class InvoiceService {
  /**
   * Raise an invoice: price its lines from the catalogue, total them, and store the snapshot.
   *
   * @param input - The patient, an optional encounter, and the lines (each a service id and quantity).
   * @param requester - The administrator raising it.
   *
   * @returns The raised invoice, or a failure naming what refused it.
   */
  public async create(input: InvoiceCreateOutput, requester: SessionUser): Promise<SingleResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const patient = await Patient.findById(input.patientId).lean<PatientEntity | null>();

      if (!patient) {
        return singleFailure(createError(VALIDATION.PATIENT_NOT_FOUND.CODE, VALIDATION.PATIENT_NOT_FOUND.MESSAGE, 'patientId'));
      }

      if (input.encounterId) {
        const encounter = await Encounter.findById(input.encounterId).lean<EncounterEntity | null>();

        if (!encounter) {
          return singleFailure(createError(VALIDATION.ENCOUNTER_NOT_FOUND.CODE, VALIDATION.ENCOUNTER_NOT_FOUND.MESSAGE, 'encounterId'));
        }

        // A bill's encounter must be the patient's own — not a lever to attach one patient's visit to another's bill.
        if (toId(encounter.patient) !== input.patientId) {
          return singleFailure(createError(VALIDATION.ENCOUNTER_PATIENT_MISMATCH.CODE, VALIDATION.ENCOUNTER_PATIENT_MISMATCH.MESSAGE, 'encounterId'));
        }
      }

      const priced = await this.priceLines(input.lines);

      if ('error' in priced) {
        return singleFailure(priced.error);
      }

      const subtotal = priced.lines.reduce((sum, line) => sum + line.lineTotalMinorUnits, 0);

      if (input.discountMinorUnits > subtotal) {
        return singleFailure(createError(VALIDATION.DISCOUNT_TOO_LARGE.CODE, VALIDATION.DISCOUNT_TOO_LARGE.MESSAGE, 'discountMinorUnits'));
      }

      const total = subtotal - input.discountMinorUnits + input.taxMinorUnits;

      const created = await Invoice.create({
        patient: input.patientId,
        encounter: input.encounterId,
        lines: priced.lines,
        subtotalMinorUnits: subtotal,
        discountMinorUnits: input.discountMinorUnits,
        taxMinorUnits: input.taxMinorUnits,
        totalMinorUnits: total,
        paidMinorUnits: 0,
        status: INVOICE_STATUSES.UNPAID,
        issuedBy: requester.userId,
        issuedAt: new Date(),
      });

      return singleSuccess((await this.toDtoList([created.toObject()]))[0]);
    } catch (error) {
      log.error({ err: error }, 'Raising an invoice failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * The invoices list for the counter, newest first, narrowed by the screen's filters.
   *
   * @param filters - Status and a patient name/record-number search.
   *
   * @returns Every matching invoice as a DTO.
   */
  public async list(filters: InvoiceFiltersOutput): Promise<ListResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const conditions: QueryFilter<InvoiceAttributes> = {};

      if (filters.status !== INVOICE_STATUS_FILTERS.ALL) {
        conditions.status = filters.status;
      }

      if (filters.query) {
        const patientIds = await this.patientIdsMatching(filters.query);

        // A search that matches no patient matches no invoice — return early rather than an unfiltered list.
        if (patientIds.length === 0) {
          return listSuccess([]);
        }

        conditions.patient = { $in: patientIds };
      }

      const invoices = await Invoice.find(conditions).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<InvoiceEntity[]>();

      return listSuccess(await this.toDtoList(invoices));
    } catch (error) {
      log.error({ err: error }, 'Listing invoices failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One invoice by id — the administrator's detail view.
   *
   * @param invoiceId - The invoice to read.
   *
   * @returns The invoice, or a not-found failure.
   */
  public async getById(invoiceId: string): Promise<SingleResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const invoice = await Invoice.findById(invoiceId).lean<InvoiceEntity | null>();

      if (!invoice) {
        return this.invoiceNotFound();
      }

      return singleSuccess((await this.toDtoList([invoice]))[0]);
    } catch (error) {
      log.error({ err: error }, 'Reading an invoice failed');

      return singleFailure(createError(DATABASE.READ_FAILED.CODE, DATABASE.READ_FAILED.MESSAGE));
    }
  }

  /**
   * A patient's own invoices, newest first — read-only, resolved from the session, never a URL.
   *
   * @param session - The signed-in patient.
   *
   * @returns Their invoices, or a failure. A patient with no record yet has an empty list.
   */
  public async listForPatient(session: SessionUser): Promise<ListResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const patient = await Patient.findOne({ user: session.userId }).select('_id').lean<Pick<PatientEntity, '_id'> | null>();

      if (!patient) {
        return listSuccess([]);
      }

      const invoices = await Invoice.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<InvoiceEntity[]>();

      return listSuccess(await this.toDtoList(invoices));
    } catch (error) {
      log.error({ err: error }, 'Listing a patient invoices failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One of a patient's own invoices, by id — scoped to the session, so a guessed id that belongs to
   * someone else reads as not-found.
   *
   * @param invoiceId - The invoice to read.
   * @param session - The signed-in patient.
   *
   * @returns The invoice, or a not-found failure.
   */
  public async getForPatient(invoiceId: string, session: SessionUser): Promise<SingleResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const patient = await Patient.findOne({ user: session.userId }).select('_id').lean<Pick<PatientEntity, '_id'> | null>();

      if (!patient) {
        return this.invoiceNotFound();
      }

      const invoice = await Invoice.findOne({ _id: invoiceId, patient: patient._id }).lean<InvoiceEntity | null>();

      if (!invoice) {
        return this.invoiceNotFound();
      }

      return singleSuccess((await this.toDtoList([invoice]))[0]);
    } catch (error) {
      log.error({ err: error }, 'Reading a patient invoice failed');

      return singleFailure(createError(DATABASE.READ_FAILED.CODE, DATABASE.READ_FAILED.MESSAGE));
    }
  }

  /**
   * Void an invoice — a deliberate cancellation with a reason, never a delete.
   *
   * @param input - The invoice and the reason.
   * @param requester - The administrator voiding it.
   *
   * @returns The voided invoice, or a failure.
   */
  public async void(input: InvoiceVoidOutput, requester: SessionUser): Promise<SingleResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const invoice = await Invoice.findById(input.invoiceId).lean<InvoiceEntity | null>();

      if (!invoice) {
        return this.invoiceNotFound();
      }

      if (invoice.status === INVOICE_STATUSES.VOID) {
        return singleFailure(createError(BUSINESS.ALREADY_VOID.CODE, BUSINESS.ALREADY_VOID.MESSAGE));
      }

      const updated = await Invoice.findByIdAndUpdate(
        input.invoiceId,
        { status: INVOICE_STATUSES.VOID, voidReason: input.reason, voidedAt: new Date(), voidedBy: requester.userId },
        { returnDocument: 'after' }
      ).lean<InvoiceEntity | null>();

      if (!updated) {
        return this.invoiceNotFound();
      }

      return singleSuccess((await this.toDtoList([updated]))[0]);
    } catch (error) {
      log.error({ err: error }, 'Voiding an invoice failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Price a set of requested lines against the catalogue, snapshotting each.
   *
   * The services are fetched in one query and matched back to the lines, so an invoice can bill the
   * same service twice and the order is preserved. A line naming a service that is gone, or one that
   * has been retired, is refused rather than billed at a guessed price.
   *
   * @param lines - The requested lines (a service id and a quantity each).
   *
   * @returns The priced lines, or an error to return.
   */
  private async priceLines(lines: InvoiceCreateOutput['lines']): Promise<{ lines: PricedLine[] } | { error: ReturnType<typeof createError> }> {
    const ids = [...new Set(lines.map(line => line.serviceItemId))];
    const items = await ServiceItem.find({ _id: { $in: ids } }).lean<ServiceItemEntity[]>();
    const itemById = new Map(items.map(item => [toId(item._id), item]));

    const priced: PricedLine[] = [];

    for (const line of lines) {
      const item = itemById.get(line.serviceItemId);

      if (!item) {
        return { error: createError(VALIDATION.SERVICE_ITEM_NOT_FOUND.CODE, VALIDATION.SERVICE_ITEM_NOT_FOUND.MESSAGE, 'lines') };
      }

      if (!item.isActive) {
        return { error: createError(VALIDATION.SERVICE_ITEM_INACTIVE.CODE, VALIDATION.SERVICE_ITEM_INACTIVE.MESSAGE, 'lines') };
      }

      priced.push({
        serviceCode: item.code,
        description: item.name,
        category: item.category,
        unitPriceMinorUnits: item.priceMinorUnits,
        quantity: line.quantity,
        lineTotalMinorUnits: item.priceMinorUnits * line.quantity,
      });
    }

    return { lines: priced };
  }

  /**
   * The patient ids whose name or medical record number matches a search — the two-step behind the
   * list's text filter, because an invoice names a patient by id.
   *
   * @param query - The raw search text.
   *
   * @returns The matching patient ids.
   */
  private async patientIdsMatching(query: string): Promise<string[]> {
    const pattern = new RegExp(escapeRegExp(query), 'i');

    const [byUser, byRecord] = await Promise.all([
      User.find({ name: pattern }).select('_id').lean<Pick<UserEntity, '_id'>[]>(),
      Patient.find({ medicalRecordNo: pattern }).select('_id user').lean<Pick<PatientEntity, '_id' | 'user'>[]>(),
    ]);

    const userIds = new Set(byUser.map(user => toId(user._id)));
    const patients = await Patient.find({ user: { $in: [...userIds] } })
      .select('_id')
      .lean<Pick<PatientEntity, '_id'>[]>();

    return [...new Set([...patients.map(patient => toId(patient._id)), ...byRecord.map(patient => toId(patient._id))])];
  }

  /**
   * Map invoices to DTOs, resolving each patient's name and record number in two batched lookups
   * rather than one pair per invoice.
   *
   * @param invoices - The stored invoices.
   *
   * @returns The invoices as DTOs.
   */
  private async toDtoList(invoices: InvoiceEntity[]): Promise<InvoiceDto[]> {
    const patientIds = [...new Set(invoices.map(invoice => toId(invoice.patient)))];

    const patients = await Patient.find({ _id: { $in: patientIds } })
      .select('medicalRecordNo user')
      .lean<Pick<PatientEntity, '_id' | 'medicalRecordNo' | 'user'>[]>();

    const users = await User.find({ _id: { $in: patients.map(patient => patient.user) } })
      .select('name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameByUser = new Map(users.map(user => [toId(user._id), user.name]));

    const infoByPatient = new Map(
      patients.map(patient => [toId(patient._id), { mrn: patient.medicalRecordNo, name: nameByUser.get(toId(patient.user)) ?? null }])
    );

    return invoices.map(invoice => {
      const info = infoByPatient.get(toId(invoice.patient));

      return invoiceFromEntity(invoice, info?.name ?? null, info?.mrn ?? null);
    });
  }

  private invoiceNotFound(): SingleResult<never> {
    return singleFailure(createError(VALIDATION.INVOICE_NOT_FOUND.CODE, VALIDATION.INVOICE_NOT_FOUND.MESSAGE));
  }
}
