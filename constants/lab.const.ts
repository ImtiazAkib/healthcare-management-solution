import { LabPriority, LabStatus } from '@/types';

export const LAB_STATUSES = {
  ORDERED: 'ordered',
  COLLECTED: 'collected',
  IN_PROGRESS: 'in-progress',
  REPORTED: 'reported',
  RELEASED: 'released',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, LabStatus>;

export const LAB_STATUS_LABELS: Record<LabStatus, string> = {
  ordered: 'Ordered',
  collected: 'Sample collected',
  'in-progress': 'In progress',
  reported: 'Reported',
  released: 'Released',
  cancelled: 'Cancelled',
};

export const LAB_PRIORITIES = {
  ROUTINE: 'routine',
  URGENT: 'urgent',
  STAT: 'stat',
} as const satisfies Record<string, LabPriority>;

export const LAB_PRIORITY_LABELS: Record<LabPriority, string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  stat: 'Immediate',
};

export const LAB_FIELD_LIMITS = {
  TEST_NAME: 200,
  TEST_CODE: 30,
  TESTS: 30,
  SUMMARY: 500,
  FINDINGS: 4000,
  FILE_NAME: 255,
} as const;

/**
 * What a diagnostic report may be uploaded as.
 *
 * Checked against the file's **magic number** in step 12, never against its extension or
 * the `Content-Type` header — both of those are supplied by whoever is uploading. Nothing
 * here can execute in a browser, which is what makes serving a report inline safe.
 */
export const LAB_REPORT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
