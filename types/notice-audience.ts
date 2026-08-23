/**
 * Who a notice is aimed at, set when it is published.
 *
 * The targeting is enforced in the service query — a patient's feed never fetches a staff notice —
 * so this is a filter on disclosure, not a hint the browser is trusted to honour. `department`
 * reaches the staff of one department; the rest are self-explanatory.
 */
export type NoticeAudience = 'everyone' | 'staff' | 'patients' | 'department';
