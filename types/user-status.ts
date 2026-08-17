/**
 * A staff account's state, as the list shows it.
 *
 * Derived rather than stored: it is a reading of `isApproved`, `isActive` and
 * `isEmailVerified` together, not a fourth column that could disagree with them. `pending`
 * is an approved-yet account whose address is proven and which is switched on — somebody
 * waiting on the hospital, not on their own inbox.
 */
export type UserStatus = 'pending' | 'active' | 'inactive';
