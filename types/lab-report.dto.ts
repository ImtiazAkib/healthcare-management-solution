import { toId } from '@/lib/utils';

import type { LabReportEntity } from '@/models/lab-report.model';

export type LabReportDto = {
  labReportId: string;
  labOrderId: string;
  patientId: string;
  performedById: string;
  summary?: string | null;
  findings?: string | null;
  /**
   * What the file is, without saying where it is. There is deliberately no `storageKey`:
   * that describes a location on the server, and the download route resolves it after
   * checking who is asking. A DTO that carried it would hand every list screen a direct
   * pointer to somebody's medical file.
   */
  file?: { fileName: string; mimeType: string; size: number } | null;
  verifiedById?: string | null;
  releasedAt?: string | null;
  /** Derived, so no screen has to remember that a report is invisible until it is released. */
  isReleased: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored lab report to its DTO.
 *
 * @param entity - Stored lab report.
 *
 * @returns Instance of LabReportDto, carrying no storage key.
 */
export function labReportFromEntity(entity: LabReportEntity): LabReportDto {
  return {
    labReportId: toId(entity._id),
    labOrderId: toId(entity.labOrder),
    patientId: toId(entity.patient),
    performedById: toId(entity.performedBy),
    summary: entity.summary ?? null,
    findings: entity.findings ?? null,
    file: entity.file ? { fileName: entity.file.fileName, mimeType: entity.file.mimeType, size: entity.file.size } : null,
    verifiedById: entity.verifiedBy ? toId(entity.verifiedBy) : null,
    releasedAt: entity.releasedAt ? entity.releasedAt.toISOString() : null,
    isReleased: Boolean(entity.releasedAt),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
