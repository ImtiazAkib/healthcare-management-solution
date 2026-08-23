import { toId } from '@/lib/utils';

import { InvoiceStatus } from './invoice-status';
import { ServiceCategory } from './service-category';

import type { InvoiceEntity } from '@/models/invoice.model';

/** One priced line as a screen sees it. Money stays integer minor units; a screen formats it once. */
export type InvoiceLineDto = {
  serviceCode: string;
  description: string;
  category: ServiceCategory;
  unitPriceMinorUnits: number;
  quantity: number;
  lineTotalMinorUnits: number;
};

/**
 * An invoice as every screen and API response sees one.
 *
 * Every amount is an integer count of minor units — the same as the model, never a formatted string,
 * so a client re-totals nothing and formats at the edge. The patient's name and record number are
 * resolved by the service and carried here so a bill reads without a second lookup; the balance is
 * derived so a screen never subtracts money itself.
 */
export type InvoiceDto = {
  invoiceId: string;
  patientId: string;
  patientName: string | null;
  medicalRecordNo: string | null;
  encounterId: string | null;
  lines: InvoiceLineDto[];
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  paidMinorUnits: number;
  balanceMinorUnits: number;
  status: InvoiceStatus;
  issuedById: string;
  issuedAt: string;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored invoice to its DTO.
 *
 * The patient's name and record number are resolved by the caller and passed in — an invoice
 * references the patient by id, and only the service holds that join.
 *
 * @param entity - Stored invoice.
 * @param patientName - The resolved patient name, or null.
 * @param medicalRecordNo - The resolved medical record number, or null.
 *
 * @returns Instance of InvoiceDto.
 */
export function invoiceFromEntity(entity: InvoiceEntity, patientName: string | null = null, medicalRecordNo: string | null = null): InvoiceDto {
  return {
    invoiceId: toId(entity._id),
    patientId: toId(entity.patient),
    patientName,
    medicalRecordNo,
    encounterId: entity.encounter ? toId(entity.encounter) : null,
    lines: entity.lines.map(line => ({
      serviceCode: line.serviceCode,
      description: line.description,
      category: line.category,
      unitPriceMinorUnits: line.unitPriceMinorUnits,
      quantity: line.quantity,
      lineTotalMinorUnits: line.lineTotalMinorUnits,
    })),
    subtotalMinorUnits: entity.subtotalMinorUnits,
    discountMinorUnits: entity.discountMinorUnits,
    taxMinorUnits: entity.taxMinorUnits,
    totalMinorUnits: entity.totalMinorUnits,
    paidMinorUnits: entity.paidMinorUnits,
    balanceMinorUnits: entity.totalMinorUnits - entity.paidMinorUnits,
    status: entity.status,
    issuedById: toId(entity.issuedBy),
    issuedAt: entity.issuedAt.toISOString(),
    voidReason: entity.voidReason ?? null,
    voidedAt: entity.voidedAt ? entity.voidedAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
