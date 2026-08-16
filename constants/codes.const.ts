import { COMMON_AUTH, COMMON_BUSINESS, COMMON_DATABASE, COMMON_VALIDATION } from './codes-common.const';

/*
  Central codes registry organized by layers.

  Format: five digits — [layer][feature][sequence]
  - Layer (1st digit):    1=Database, 2=Validation, 3=Business, 4=External, 5=Auth
  - Feature (2nd digit):  0=Common, 1=Users, 2=Patients, 3=Scheduling, 4=Clinical,
                          5=Diagnostics, 6=Billing, 7=Communication, 8=Audit
  - Sequence (last three): 000-999

  The feature digits are allocated up front and the files that fill them are not. A feature
  adds its own `codes-{feature}.const.ts` **with the service that raises those codes**, and
  registers it here — so every code in the application is reachable from one place, none of
  them collide, and no taxonomy is invented for a feature that does not exist yet.

  Only the common codes exist today; each layer below therefore holds one entry.
*/
export const CODES = {
  /**
   * Layer 1: Database/persistence errors (1xxxx)
   */
  DATABASE: {
    COMMON: COMMON_DATABASE, // 10xxx
  },

  /**
   * Layer 2: Validation errors (2xxxx)
   */
  VALIDATION: {
    COMMON: COMMON_VALIDATION, // 20xxx
  },

  /**
   * Layer 3: Business logic errors (3xxxx)
   */
  BUSINESS: {
    COMMON: COMMON_BUSINESS, // 30xxx
  },

  /**
   * Layer 5: Authentication and authorization errors (5xxxx)
   */
  AUTH: {
    COMMON: COMMON_AUTH, // 50xxx
  },
} as const;
