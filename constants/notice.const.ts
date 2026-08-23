import { NoticeAudience, NoticeCategory } from '@/types';

/**
 * Who a notice is aimed at. Targeting is applied in the service query, never by hiding a card the
 * query already returned — the payload is the disclosure.
 *
 * - `everyone` — every signed-in account, staff and patients alike.
 * - `staff` — the clinical and administrative staff, never patients.
 * - `patients` — patients only.
 * - `department` — the staff of one department. Only a doctor carries a department in this data
 *   model, so a department notice reaches that department's doctors (and the administrators who
 *   manage it), and no one else.
 */
export const NOTICE_AUDIENCES = {
  EVERYONE: 'everyone',
  STAFF: 'staff',
  PATIENTS: 'patients',
  DEPARTMENT: 'department',
} as const satisfies Record<string, NoticeAudience>;

/**
 * What kind of notice this is.
 *
 * - `general` — the ordinary announcement.
 * - `emergency` — pins to the top of every targeted dashboard and carries the destructive
 *   treatment. It is the only notice that pins, and the only one styled that way.
 * - `service` — a change to a service: a machine down, a clinic relocated, hours changed.
 */
export const NOTICE_CATEGORIES = {
  GENERAL: 'general',
  EMERGENCY: 'emergency',
  SERVICE: 'service',
} as const satisfies Record<string, NoticeCategory>;

export const NOTICE_AUDIENCE_LABELS: Record<NoticeAudience, string> = {
  everyone: 'Everyone',
  staff: 'Staff',
  patients: 'Patients',
  department: 'A department',
};

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  general: 'General',
  emergency: 'Emergency',
  service: 'Service',
};

/** The chip color for each category, so an emergency reads as one at a glance. */
export const NOTICE_CATEGORY_VARIANTS: Record<NoticeCategory, 'destructive' | 'warning' | 'neutral'> = {
  general: 'neutral',
  emergency: 'destructive',
  service: 'warning',
};

export const NOTICE_FIELD_LIMITS = {
  TITLE: 160,
  BODY: 5000,
} as const;

/**
 * Notice-image policy.
 *
 * Images only — no PDF, no SVG. An SVG is a document that can carry script, and a notice image is a
 * banner, not an attachment. The bytes are magic-number checked in the service, not trusted from the
 * declared type. Images share the file bucket and its cap with diagnostic reports (see the note on
 * `STORAGE_FULL`); this per-file ceiling is the smaller, notice-specific one.
 */
export const NOTICE_IMAGE = {
  MIME_TYPES: ['image/png', 'image/jpeg', 'image/webp'] as const,
  ACCEPT: 'image/png,image/jpeg,image/webp',
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
} as const;

/**
 * A medical record number as it appears loose in text — unanchored, so it is found anywhere in a
 * body rather than only when the whole string is one. It is what the notice service refuses in a
 * title or body: a notice is not clinical and carries no patient identity, and this is a small guard
 * against the most likely accidental disclosure in the whole application.
 */
export const NOTICE_MRN_PATTERN = /HMS-\d{4}-\d{6}/i;
