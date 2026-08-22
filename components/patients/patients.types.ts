import { BLOOD_GROUPS } from '@/constants/patient.const';
import { GENDER_LABELS, GENDERS } from '@/constants/users.const';

/*
  Option maps for the register form and the edit dialog, kept together so the two screens offer
  the same choices in the same order. The leading empty value is a real, submittable "none" — the
  schemas map it back to undefined — so blood group and gender can be left unrecorded or cleared.
*/

/** Blood-group options, `''` meaning not recorded. */
export const BLOOD_GROUP_ITEMS: Record<string, string> = {
  '': 'Unknown',
  ...Object.fromEntries(BLOOD_GROUPS.map(group => [group, group])),
};

/** Gender options, `''` meaning not recorded. */
export const GENDER_ITEMS: Record<string, string> = {
  '': 'Not recorded',
  ...Object.fromEntries(Object.values(GENDERS).map(gender => [gender, GENDER_LABELS[gender]])),
};
