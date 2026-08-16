import { z } from 'zod';

import { CODES } from '@/constants/codes.const';
import { USER_ROLES } from '@/constants/roles.const';
import { ACCOUNT_FIELD_LIMITS, BANGLADESH_PHONE_STORED_PATTERN, GENDERS, MAX_AGE_YEARS } from '@/constants/users.const';

import { encodeZodMessage, normalizeBangladeshPhone } from '@/lib/utils';

const USERS = CODES.VALIDATION.USERS;

/*
  Messages carry their error code, encoded into the string, because Zod issues have nowhere
  else to put one. `mapZodErrorsToErrorDto()` unpacks them back into `{ code, error, field }`
  on the way out.

  Only the user schemas carry codes today: they are the first ones a service consumes, in
  the authentication step. The department, doctor and patient schemas below use plain
  messages, which decode to code 0 and still render — they get codes with the services that
  raise them.
*/
export const userFields = {
  name: z
    .string()
    .trim()
    .min(1, encodeZodMessage(USERS.NAME_REQUIRED.CODE, USERS.NAME_REQUIRED.MESSAGE))
    .max(ACCOUNT_FIELD_LIMITS.NAME, encodeZodMessage(USERS.NAME_TOO_LONG.CODE, USERS.NAME_TOO_LONG.MESSAGE)),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, encodeZodMessage(USERS.EMAIL_REQUIRED.CODE, USERS.EMAIL_REQUIRED.MESSAGE))
    .pipe(z.email(encodeZodMessage(USERS.EMAIL_INVALID.CODE, USERS.EMAIL_INVALID.MESSAGE))),

  password: z
    .string()
    .min(ACCOUNT_FIELD_LIMITS.PASSWORD_MIN, encodeZodMessage(USERS.PASSWORD_TOO_SHORT.CODE, USERS.PASSWORD_TOO_SHORT.MESSAGE))
    .max(ACCOUNT_FIELD_LIMITS.PASSWORD_MAX, encodeZodMessage(USERS.PASSWORD_TOO_LONG.CODE, USERS.PASSWORD_TOO_LONG.MESSAGE)),

  role: z.enum(Object.values(USER_ROLES), encodeZodMessage(USERS.ROLE_INVALID.CODE, USERS.ROLE_INVALID.MESSAGE)),

  gender: z.enum(Object.values(GENDERS), encodeZodMessage(USERS.GENDER_INVALID.CODE, USERS.GENDER_INVALID.MESSAGE)),

  /*
    A Bangladesh mobile number — one facility, one country. `normalizeBangladeshPhone` maps
    whatever is typed onto the single stored shape, then the pattern checks it. The
    transform is idempotent (its own output normalizes to itself), which is what lets a
    Server Action re-validate a value the browser already normalized without it failing on
    the second pass.

    An empty string stays empty rather than becoming an error: the field is optional in
    every schema that composes it, and emptiness is answered there.
  */
  phone: z
    .string()
    .trim()
    .transform(value => normalizeBangladeshPhone(value))
    .refine(
      value => value === '' || BANGLADESH_PHONE_STORED_PATTERN.test(value),
      encodeZodMessage(USERS.PHONE_INVALID.CODE, USERS.PHONE_INVALID.MESSAGE)
    ),

  /*
    Arrives as the `YYYY-MM-DD` string a date input submits and leaves as a `Date`, or as
    nothing at all when the box was untouched.

    **Parsing has to be idempotent here**, for the same reason as `phone`: the value is
    parsed once in the browser and again in the Server Action, so the schema accepts a
    `Date` as well as a string. A string-only schema would reject its own output on the
    second pass and every save carrying a date of birth would fail.

    The two bounds report separately — a future date is a typo somebody can see, an
    implausible year is usually a mistyped one — because "invalid date" tells nobody which
    of the two they did.
  */
  dateOfBirth: z
    .union([z.date(), z.string().trim()])
    .transform(value => (value === '' ? undefined : new Date(value)))
    .superRefine((value, ctx) => {
      if (value === undefined) {
        return;
      }

      if (Number.isNaN(value.getTime())) {
        ctx.addIssue({ code: 'custom', message: encodeZodMessage(USERS.DATE_OF_BIRTH_INVALID.CODE, USERS.DATE_OF_BIRTH_INVALID.MESSAGE) });
        return;
      }

      if (value.getTime() > Date.now()) {
        ctx.addIssue({ code: 'custom', message: encodeZodMessage(USERS.DATE_OF_BIRTH_IN_FUTURE.CODE, USERS.DATE_OF_BIRTH_IN_FUTURE.MESSAGE) });
        return;
      }

      const earliest = new Date();
      earliest.setFullYear(earliest.getFullYear() - MAX_AGE_YEARS);

      if (value.getTime() < earliest.getTime()) {
        ctx.addIssue({ code: 'custom', message: encodeZodMessage(USERS.DATE_OF_BIRTH_IMPLAUSIBLE.CODE, USERS.DATE_OF_BIRTH_IMPLAUSIBLE.MESSAGE) });
      }
    }),
};
