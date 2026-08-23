/**
 * Where an invoice stands.
 *
 * Every value but `void` is **derived from payments**, not set by hand: an unpaid invoice becomes
 * `partial` on a first payment and `paid` once the balance is cleared. `void` is the one deliberate
 * status — a cancelled bill, with a reason, that keeps its history rather than being deleted. `draft`
 * is reserved for an invoice still being assembled before it is issued.
 */
export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'void';
