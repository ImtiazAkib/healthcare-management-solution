import { AuditAction, AuditEntity, AuditOutcome } from '@/types';

/** What was done to a record. */
export const AUDIT_ACTIONS = {
  VIEW: 'view',
  DOWNLOAD: 'download',
} as const satisfies Record<string, AuditAction>;

/** The kind of record accessed. */
export const AUDIT_ENTITIES = {
  PATIENT: 'patient',
  TIMELINE: 'timeline',
  ENCOUNTER: 'encounter',
  PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab-report',
} as const satisfies Record<string, AuditEntity>;

/** Whether access was allowed. */
export const AUDIT_OUTCOMES = {
  GRANTED: 'granted',
  REFUSED: 'refused',
} as const satisfies Record<string, AuditOutcome>;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  view: 'Viewed',
  download: 'Downloaded',
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntity, string> = {
  patient: 'Patient record',
  timeline: 'Patient timeline',
  encounter: 'Encounter',
  prescription: 'Prescription',
  'lab-report': 'Lab report',
};

export const AUDIT_OUTCOME_LABELS: Record<AuditOutcome, string> = {
  granted: 'Granted',
  refused: 'Refused',
};

/** The chip color for an outcome — a refused access is worth a second glance. */
export const AUDIT_OUTCOME_VARIANTS: Record<AuditOutcome, 'neutral' | 'destructive'> = {
  granted: 'neutral',
  refused: 'destructive',
};

/** How many rows the access-trail screen shows. The trail is append-only; a screen reads a page of it. */
export const AUDIT_LIST_LIMIT = 200;

/** The outcome filter — the two outcomes plus the shared "all" sentinel. */
export const AUDIT_OUTCOME_FILTERS = {
  ALL: 'all',
  GRANTED: 'granted',
  REFUSED: 'refused',
} as const;
