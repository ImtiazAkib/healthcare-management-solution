import { COMMON_AUTH, COMMON_BUSINESS, COMMON_DATABASE, COMMON_VALIDATION } from './codes-common.const';
import { DEPARTMENTS_BUSINESS, DEPARTMENTS_DATABASE, DEPARTMENTS_VALIDATION } from './codes-departments.const';
import { SERVICES_BUSINESS, SERVICES_DATABASE, SERVICES_VALIDATION } from './codes-services.const';
import { USERS_AUTH, USERS_BUSINESS, USERS_DATABASE, USERS_VALIDATION } from './codes-users.const';

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

  Common and users exist today. The user schemas are the first ones a service consumes, in
  the authentication step — the other entities get their codes when the services that raise
  them land, and until then their validation messages decode to code 0 and still render.
*/
export const CODES = {
  /**
   * Layer 1: Database/persistence errors (1xxxx)
   */
  DATABASE: {
    COMMON: COMMON_DATABASE, // 10xxx
    USERS: USERS_DATABASE, // 11xxx
    DEPARTMENTS: DEPARTMENTS_DATABASE, // 13xxx
    SERVICES: SERVICES_DATABASE, // 16xxx
  },

  /**
   * Layer 2: Validation errors (2xxxx)
   */
  VALIDATION: {
    COMMON: COMMON_VALIDATION, // 20xxx
    USERS: USERS_VALIDATION, // 21xxx
    DEPARTMENTS: DEPARTMENTS_VALIDATION, // 23xxx
    SERVICES: SERVICES_VALIDATION, // 26xxx
  },

  /**
   * Layer 3: Business logic errors (3xxxx)
   */
  BUSINESS: {
    COMMON: COMMON_BUSINESS, // 30xxx
    USERS: USERS_BUSINESS, // 31xxx
    DEPARTMENTS: DEPARTMENTS_BUSINESS, // 33xxx
    SERVICES: SERVICES_BUSINESS, // 36xxx
  },

  /**
   * Layer 5: Authentication and authorization errors (5xxxx)
   */
  AUTH: {
    COMMON: COMMON_AUTH, // 50xxx
    USERS: USERS_AUTH, // 51xxx
  },
} as const;
