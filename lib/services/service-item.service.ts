import { ServiceItem } from '@/models/service-item.model';
import { ServiceItemDto, serviceItemFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { SERVICE_CATEGORY_FILTERS, SERVICE_STATUS_FILTERS } from '@/constants/service.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import {
  EmptyResult,
  ListResult,
  SingleResult,
  createError,
  emptyFailureWithError,
  emptySuccess,
  listFailure,
  listSuccess,
  singleFailure,
  singleSuccess,
} from '@/lib/result';
import type { ServiceItemCreateOutput, ServiceItemFiltersOutput, ServiceItemUpdateOutput } from '@/lib/schemas';
import { escapeRegExp, toId } from '@/lib/utils';

import type { ServiceItemAttributes, ServiceItemEntity } from '@/models/service-item.model';
import type { QueryFilter, UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('service-item.service');

const DATABASE = CODES.DATABASE.SERVICES;
const VALIDATION = CODES.VALIDATION.SERVICES;

/*
  The priced catalogue billing later draws on. Simpler than departments — there is no head to
  validate — but the same two instincts hold: a name and a code are each unique, and a service
  is retired rather than deleted so an older invoice keeps rendering the line it billed.

  Price is an integer count of minor units throughout. The schema does the major-unit parsing
  (`'500.50'` → `50050`); the service only ever sees the integer, and stores it as-is.
*/
export class ServiceItemService {
  /**
   * List the catalogue, alphabetically, narrowed by the screen's filters.
   *
   * @param filters - Category, status and search text, already validated.
   *
   * @returns Every matching service as a DTO.
   */
  public async list(filters: ServiceItemFiltersOutput): Promise<ListResult<ServiceItemDto>> {
    try {
      await connectToDatabase();

      const services = await ServiceItem.find(this.buildConditions(filters)).sort({ name: 1 }).lean<ServiceItemEntity[]>();

      return listSuccess(services.map(serviceItemFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing services failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One service, by id.
   *
   * @param serviceItemId - The service to read.
   *
   * @returns The service, or a failure.
   */
  public async getById(serviceItemId: string): Promise<SingleResult<ServiceItemDto>> {
    try {
      await connectToDatabase();

      const service = await ServiceItem.findById(serviceItemId).lean<ServiceItemEntity | null>();

      if (!service) {
        return this.notFound();
      }

      return singleSuccess(serviceItemFromEntity(service));
    } catch (error) {
      log.error({ err: error }, 'Reading a service failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Create a service.
   *
   * @param input - Validated create input, price already in minor units.
   *
   * @returns The created service, or a failure naming the field that refused it.
   */
  public async create(input: ServiceItemCreateOutput): Promise<SingleResult<ServiceItemDto>> {
    try {
      await connectToDatabase();

      const clash = await this.refuseClash(input.name, input.code, null);

      if (clash) {
        return clash;
      }

      const created = await ServiceItem.create({
        name: input.name,
        code: input.code,
        category: input.category,
        description: this.optionalText(input.description),
        priceMinorUnits: input.price,
      });

      return singleSuccess(serviceItemFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Creating a service failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a service.
   *
   * @param input - Validated update input.
   *
   * @returns The updated service, or a failure.
   */
  public async update(input: ServiceItemUpdateOutput): Promise<SingleResult<ServiceItemDto>> {
    try {
      await connectToDatabase();

      const target = await ServiceItem.findById(input.serviceItemId).lean<ServiceItemEntity | null>();

      if (!target) {
        return this.notFound();
      }

      const clash = await this.refuseClash(input.name, input.code, toId(target._id));

      if (clash) {
        return clash;
      }

      const updated = await ServiceItem.findByIdAndUpdate(
        input.serviceItemId,
        this.toUpdateDocument({
          name: input.name,
          code: input.code,
          category: input.category,
          description: this.optionalText(input.description),
          priceMinorUnits: input.price,
        }),
        { returnDocument: 'after' }
      ).lean<ServiceItemEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(serviceItemFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Updating a service failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Switch a service on or off. Deactivation retires it from every picker while keeping the row
   * an older invoice's snapshot was taken from — the safe operation, always allowed.
   *
   * @param input - Validated activation input.
   *
   * @returns The updated service, or a failure.
   */
  public async setActive(input: { serviceItemId: string; isActive: boolean }): Promise<SingleResult<ServiceItemDto>> {
    try {
      await connectToDatabase();

      const updated = await ServiceItem.findByIdAndUpdate(
        input.serviceItemId,
        { isActive: input.isActive },
        { returnDocument: 'after' }
      ).lean<ServiceItemEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(serviceItemFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Changing a service state failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Delete a service.
   *
   * Nothing references a service yet, so a delete is clean today. When diagnostics (step 12)
   * and billing (step 19) land, the reference guard belongs here beside them, raising the
   * already-reserved `SERVICES_BUSINESS.CANNOT_DELETE_REFERENCED` — for now deactivation is the
   * offered alternative and the row is simply removed.
   *
   * @param serviceItemId - The service to delete.
   *
   * @returns Empty success, or a failure.
   */
  public async delete(serviceItemId: string): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const target = await ServiceItem.findById(serviceItemId).lean<ServiceItemEntity | null>();

      if (!target) {
        return emptyFailureWithError(createError(VALIDATION.SERVICE_NOT_FOUND.CODE, VALIDATION.SERVICE_NOT_FOUND.MESSAGE));
      }

      await ServiceItem.findByIdAndDelete(serviceItemId);

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Deleting a service failed');

      return emptyFailureWithError(createError(DATABASE.DELETE_FAILED.CODE, DATABASE.DELETE_FAILED.MESSAGE));
    }
  }

  /**
   * Refuse a name or code already worn by another service, field by field so the error names
   * the one that clashed. On an edit the current row is excluded.
   *
   * @param name - The proposed name.
   * @param code - The proposed code, already upper-cased by the schema.
   * @param excludeId - The row being edited, or null on create.
   *
   * @returns A failure to return, or null when both are free.
   */
  private async refuseClash(name: string, code: string, excludeId: string | null): Promise<SingleResult<ServiceItemDto> | null> {
    const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};

    const nameTaken = await ServiceItem.findOne({ name, ...notSelf }).lean<ServiceItemEntity | null>();

    if (nameTaken) {
      return singleFailure(createError(VALIDATION.NAME_ALREADY_USED.CODE, VALIDATION.NAME_ALREADY_USED.MESSAGE, 'name'));
    }

    const codeTaken = await ServiceItem.findOne({ code, ...notSelf }).lean<ServiceItemEntity | null>();

    if (codeTaken) {
      return singleFailure(createError(VALIDATION.CODE_ALREADY_USED.CODE, VALIDATION.CODE_ALREADY_USED.MESSAGE, 'code'));
    }

    return null;
  }

  /**
   * Translate the screen's filters into a Mongo query.
   *
   * @param filters - Category, status and search text.
   *
   * @returns Conditions for `ServiceItem.find()`.
   */
  private buildConditions(filters: ServiceItemFiltersOutput): QueryFilter<ServiceItemAttributes> {
    const conditions: QueryFilter<ServiceItemAttributes> = {};

    if (filters.category !== SERVICE_CATEGORY_FILTERS.ALL) {
      conditions.category = filters.category;
    }

    if (filters.status === SERVICE_STATUS_FILTERS.ACTIVE) {
      conditions.isActive = true;
    }

    if (filters.status === SERVICE_STATUS_FILTERS.INACTIVE) {
      conditions.isActive = false;
    }

    if (filters.query) {
      const pattern = new RegExp(escapeRegExp(filters.query), 'i');

      conditions.$or = [{ name: pattern }, { code: pattern }];
    }

    return conditions;
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  /**
   * Present values written with `$set`, absent ones cleared with `$unset` — so emptying the
   * description removes it rather than being dropped as an `undefined` key.
   *
   * @param fields - The values to write, `undefined` meaning "no longer set".
   *
   * @returns An update document that both writes and clears.
   */
  private toUpdateDocument(fields: Record<string, unknown>): UpdateQuery<ServiceItemAttributes> {
    const assigned: Record<string, unknown> = {};
    const cleared: Record<string, ''> = {};

    Object.entries(fields).forEach(([field, value]) => {
      if (value === undefined) {
        cleared[field] = '';

        return;
      }

      assigned[field] = value;
    });

    return Object.keys(cleared).length > 0 ? { $set: assigned, $unset: cleared } : { $set: assigned };
  }

  private notFound(): SingleResult<ServiceItemDto> {
    return singleFailure(createError(VALIDATION.SERVICE_NOT_FOUND.CODE, VALIDATION.SERVICE_NOT_FOUND.MESSAGE));
  }
}
