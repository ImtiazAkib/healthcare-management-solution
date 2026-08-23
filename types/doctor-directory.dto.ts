import { AvailabilityDto } from './availability.dto';
import { DayOfWeek } from './day-of-week';
import { DoctorDto } from './doctor.dto';

/** One sitting block a patient sees when choosing a doctor — the day, the hours, and the room. */
export type DoctorDirectorySlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string | null;
};

/**
 * A doctor as the patient directory publishes them.
 *
 * It names every field on purpose, so a column added to the doctor record later stays invisible
 * until it is deliberately published here. It carries the name, department, specialization,
 * designation, whether they are taking patients, and their sitting hours — and **nothing personal**:
 * no registration number, no fee, no contact detail, no patient list.
 */
export type DoctorDirectoryDto = {
  doctorId: string;
  name: string;
  departmentName: string;
  specialization: string;
  designation?: string | null;
  isAcceptingPatients: boolean;
  sittingHours: DoctorDirectorySlot[];
};

/**
 * Assemble a directory entry from the doctor record, the resolved account name and department name,
 * and the doctor's active availability blocks.
 *
 * @param doctor - The doctor DTO (record fields).
 * @param name - The doctor's name, from their account.
 * @param departmentName - The department's name.
 * @param availability - The doctor's availability blocks; only the active ones are published.
 *
 * @returns Instance of DoctorDirectoryDto.
 */
export function doctorDirectoryFromParts(
  doctor: DoctorDto,
  name: string,
  departmentName: string,
  availability: AvailabilityDto[]
): DoctorDirectoryDto {
  return {
    doctorId: doctor.doctorId,
    name,
    departmentName,
    specialization: doctor.specialization,
    designation: doctor.designation ?? null,
    isAcceptingPatients: doctor.isAcceptingPatients,
    sittingHours: availability
      .filter(block => block.isActive)
      .map(block => ({ dayOfWeek: block.dayOfWeek, startTime: block.startTime, endTime: block.endTime, room: block.room ?? null })),
  };
}
