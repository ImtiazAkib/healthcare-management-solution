/**
 * Field lengths for the directory the hospital keeps of itself — its departments and the
 * doctors who sit in them. Applied in both the zod schema and the Mongoose schema, for the
 * same reason as the account limits.
 */
export const DEPARTMENT_FIELD_LIMITS = {
  NAME: 120,
  CODE: 12,
  DESCRIPTION: 500,
} as const;

export const DOCTOR_FIELD_LIMITS = {
  SPECIALIZATION: 120,
  DESIGNATION: 120,
  REGISTRATION_NO: 40,
  ROOM_NO: 20,
  BIOGRAPHY: 1000,
} as const;

/**
 * A department code as it is stored: letters and digits, upper-cased — `CARD`, `ORTHO`.
 * It is what appears beside a doctor's name on a printed prescription, so it stays short
 * and typeable rather than being a generated id.
 */
export const DEPARTMENT_CODE_PATTERN = /^[A-Z0-9]{2,12}$/;

/**
 * A consultation fee is stored in the smallest currency unit, as an integer.
 *
 * Floating-point money is a bug with a delay on it: `0.1 + 0.2` is not `0.3`, and a fee
 * that survives one arithmetic operation intact will not survive a discount and a tax line
 * later. The ceiling is a sanity bound against a fee entered in the wrong unit.
 */
export const CONSULTATION_FEE_MAX_MINOR_UNITS = 10_000_000;
