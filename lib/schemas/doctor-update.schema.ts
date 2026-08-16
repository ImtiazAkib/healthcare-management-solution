import { z } from 'zod';

import { doctorFields } from './doctor-create.schema';
import { objectIdField } from './object-id.schema';

/*
  No `userId`. Which account a doctor record belongs to is settled when it is created and
  never moved — reassigning it would hand one doctor's entire clinical history to another
  person. The department is editable; a doctor transfers between departments.
*/
export const DoctorUpdateSchema = z.object({
  doctorId: objectIdField,
  departmentId: objectIdField,
  specialization: doctorFields.specialization,
  designation: doctorFields.designation.optional().or(z.literal('')),
  registrationNo: doctorFields.registrationNo,
  consultationFee: doctorFields.consultationFee,
  roomNo: doctorFields.roomNo.optional().or(z.literal('')),
  biography: doctorFields.biography.optional().or(z.literal('')),
});

export type DoctorUpdateInput = z.input<typeof DoctorUpdateSchema>;
export type DoctorUpdateOutput = z.output<typeof DoctorUpdateSchema>;
