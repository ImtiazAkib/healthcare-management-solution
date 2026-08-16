/**
 * Helper function to create error definition.
 *
 * @param code - Error code.
 * @param message - Error message.
 *
 * @returns Error definition object.
 */
const createErrorDefinition = (code: number, message: string) => ({ CODE: code, MESSAGE: message }) as const;

/**
 * Database layer errors for Users (11000-11999).
 */
export const USERS_DATABASE = {
  LIST_FAILED: createErrorDefinition(11000, 'Failed to list users'),
  FIND_BY_ID_FAILED: createErrorDefinition(11001, 'Failed to find user'),
  FIND_BY_EMAIL_FAILED: createErrorDefinition(11002, 'Failed to find user by email'),
  CREATE_FAILED: createErrorDefinition(11003, 'Failed to create user'),
  UPDATE_FAILED: createErrorDefinition(11004, 'Failed to update user'),
  DELETE_FAILED: createErrorDefinition(11005, 'Failed to delete user'),
} as const;

/**
 * Validation layer errors for Users (21000-21999).
 */
export const USERS_VALIDATION = {
  NAME_REQUIRED: createErrorDefinition(21000, 'Name is required.'),
  NAME_TOO_LONG: createErrorDefinition(21001, 'Name cannot exceed 120 characters.'),
  EMAIL_REQUIRED: createErrorDefinition(21002, 'Email is required.'),
  EMAIL_INVALID: createErrorDefinition(21003, 'Enter a valid email address.'),
  PASSWORD_TOO_SHORT: createErrorDefinition(21004, 'Password must be at least 8 characters.'),
  PASSWORD_TOO_LONG: createErrorDefinition(21005, 'Password cannot exceed 128 characters.'),
  ROLE_INVALID: createErrorDefinition(21006, 'Choose a valid role.'),
  // One facility, one country: a phone number here is a Bangladesh mobile number.
  PHONE_INVALID: createErrorDefinition(21007, 'Enter a valid Bangladesh mobile number, e.g. 01712345678.'),
  GENDER_INVALID: createErrorDefinition(21008, 'Choose a valid option.'),
  USER_NOT_FOUND: createErrorDefinition(21009, 'User not found.'),
  EMAIL_ALREADY_USED: createErrorDefinition(21010, 'That email address is already registered.'),
  /*
    Two bounds, one field, two messages. A future birth date is a typo somebody can see and
    fix; an implausibly old one is usually a mistyped year. Reporting them apart is what
    lets the form say something useful rather than "invalid date".
  */
  DATE_OF_BIRTH_IN_FUTURE: createErrorDefinition(21011, 'Date of birth cannot be in the future.'),
  DATE_OF_BIRTH_IMPLAUSIBLE: createErrorDefinition(21012, 'Check the year of birth.'),
  DATE_OF_BIRTH_INVALID: createErrorDefinition(21013, 'Enter a valid date.'),
  // A confirmation with two password boxes: they have to agree before either is saved.
  PASSWORD_MISMATCH: createErrorDefinition(21014, 'Both passwords must match.'),
  // Distinct from the length rule on the new one: an empty current-password box is
  // "you left this blank", not "too short".
  CURRENT_PASSWORD_REQUIRED: createErrorDefinition(21015, 'Enter your current password.'),
} as const;

/**
 * Business layer errors for Users (31000-31999).
 */
export const USERS_BUSINESS = {
  ADMIN_LIMIT_REACHED: createErrorDefinition(31000, 'The facility already has the maximum number of administrators.'),
  CANNOT_CHANGE_OWN_ACCESS: createErrorDefinition(31001, 'You cannot change your own role or access.'),
  SUPER_ADMIN_IS_IMMUTABLE: createErrorDefinition(31002, 'The super administrator account is seeded, and cannot be created or changed here.'),
  /*
    A role is set once, when the account is created, and never moved afterwards. Editing an
    account corrects its name and its contact details; it does not turn a nurse into a
    doctor. The edit form locks the control, and this is the boundary that makes the lock
    real for a request that skips the form.
  */
  ROLE_IS_IMMUTABLE: createErrorDefinition(31003, 'An account keeps the role it was created with; it cannot be changed here.'),
  /*
    The division of labour: the super administrator creates administrators, and
    administrators create clinical staff. So the one role the super administrator may
    create is `admin` — anything else is somebody else's to make.
  */
  SUPER_ADMIN_CREATES_ADMINS_ONLY: createErrorDefinition(31004, 'The super administrator can only create administrator accounts.'),
} as const;

/**
 * Authentication errors for Users (51000-51999).
 */
export const USERS_AUTH = {
  /*
    Deliberately the same error for an unknown email and a wrong password. Telling the two
    apart lets anyone test which addresses have accounts here — and in a hospital, an
    address that has an account is a person who is a patient.
  */
  INVALID_CREDENTIALS: createErrorDefinition(51000, 'Email or password is incorrect.'),
  ACCOUNT_NOT_APPROVED: createErrorDefinition(51001, 'This account is waiting for approval.'),
  ACCOUNT_DEACTIVATED: createErrorDefinition(51002, 'This account has been deactivated.'),
  SIGN_IN_FAILED: createErrorDefinition(51003, 'Sign-in could not be completed. Try again.'),
  ADMIN_MANAGED_BY_SUPER_ADMIN: createErrorDefinition(51004, 'Only the super administrator can manage administrator accounts.'),
  /*
    A different refusal from ACCOUNT_NOT_APPROVED, and it has to be: "check your inbox" and
    "wait for the hospital" are different problems with different remedies, and one message
    for both leaves the visitor with nothing to act on.
  */
  EMAIL_NOT_VERIFIED: createErrorDefinition(51005, 'Confirm your email address before signing in.'),
  /*
    Raised only after the account was found and the current password was checked, so it
    tells the owner their entry was wrong rather than telling a stranger the account exists.
  */
  CURRENT_PASSWORD_INCORRECT: createErrorDefinition(51006, 'Your current password is incorrect.'),
} as const;
