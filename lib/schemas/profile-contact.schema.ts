import { z } from 'zod';

import { PATIENT_FIELD_LIMITS } from '@/constants/patient.const';

/*
  A patient editing the two things about their record that are theirs to describe: who to call in an
  emergency, and where they live. Everything clinical — allergies, conditions, blood group — is
  deliberately absent: a patient-supplied allergy that overwrites a clinician's is a patient-safety
  problem, not a convenience, so it is not on this form and cannot be reached through it.

  These are plain messages (they decode to code 0 and still render), following the convention the
  patient and department schemas already set — the encoded user codes are reserved for the account
  fields a service raises by code.

  The emergency contact is all-or-nothing: the stored sub-document requires a name, a relation and a
  phone together, so a `superRefine` insists on all three once any one is given, and reports the gap
  on the boxes that are still empty. Leave all three blank to record no contact at all.
*/
const optionalText = (max: number, message: string) => z.string().trim().max(max, message).optional().or(z.literal(''));

export const ProfileContactSchema = z
  .object({
    emergencyName: optionalText(PATIENT_FIELD_LIMITS.CONTACT_NAME, 'Contact name is too long.'),
    emergencyRelation: optionalText(PATIENT_FIELD_LIMITS.CONTACT_RELATION, 'Relation is too long.'),
    emergencyPhone: optionalText(20, 'Contact phone is too long.'),
    address: optionalText(PATIENT_FIELD_LIMITS.ADDRESS, 'Address is too long.'),
  })
  .superRefine((values, ctx) => {
    const name = (values.emergencyName ?? '').trim();
    const relation = (values.emergencyRelation ?? '').trim();
    const phone = (values.emergencyPhone ?? '').trim();

    const anyGiven = name !== '' || relation !== '' || phone !== '';

    if (!anyGiven) {
      return;
    }

    if (name === '') {
      ctx.addIssue({ code: 'custom', path: ['emergencyName'], message: 'Enter the contact name, or clear all three boxes.' });
    }

    if (relation === '') {
      ctx.addIssue({ code: 'custom', path: ['emergencyRelation'], message: 'Enter how they are related, or clear all three boxes.' });
    }

    if (phone === '') {
      ctx.addIssue({ code: 'custom', path: ['emergencyPhone'], message: 'Enter a contact phone, or clear all three boxes.' });
    }
  });

export type ProfileContactInput = z.input<typeof ProfileContactSchema>;
export type ProfileContactOutput = z.output<typeof ProfileContactSchema>;
