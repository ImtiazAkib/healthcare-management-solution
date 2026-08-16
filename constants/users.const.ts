import { Gender } from '@/types';

/**
 * Field lengths, declared once and applied twice — in the zod schema that validates the
 * form and in the Mongoose schema that stores the value. The seed script and the services
 * write straight to the model, so the model needs its own bound rather than trusting that
 * every caller went through a schema.
 */
export const ACCOUNT_FIELD_LIMITS = {
  NAME: 120,
  EMAIL: 255,
  PHONE: 20,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
} as const;

export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const satisfies Record<string, Gender>;

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

/**
 * A Bangladesh mobile number as it is stored: `+8801` followed by nine digits.
 *
 * One facility in one country, so the app takes a side rather than accepting anything
 * shaped vaguely like a phone number. A number that is stored in one shape is a number the
 * reminder service in step 18 can dial without re-parsing it per row.
 */
export const BANGLADESH_PHONE_STORED_PATTERN = /^\+8801\d{9}$/;

/**
 * Nobody in a hospital record was born in the future, and nobody is 150. Both bounds exist
 * to catch a mistyped year rather than to make a claim about human lifespan — a date of
 * birth in 2062 is a typo that would otherwise compute a negative age on every screen that
 * shows one.
 */
export const MAX_AGE_YEARS = 130;
