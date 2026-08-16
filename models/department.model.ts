import mongoose, { Model, Schema, Types } from 'mongoose';

import { DEPARTMENT_FIELD_LIMITS } from '@/constants/directory.const';

export type DepartmentAttributes = {
  name: string;
  /** Short, typeable, upper-cased — `CARD`, `ORTHO`. It prints beside a doctor's name. */
  code: string;
  description?: string;
  /**
   * A `Doctor`, not a `User`: the head of cardiology is a doctor in that capacity, and the
   * reference should break if the doctor record goes rather than dangle off an account.
   * Optional — a department can exist before anybody leads it.
   */
  headDoctor?: Types.ObjectId;
  /**
   * Deactivate rather than delete. Last month's appointments and invoices still name this
   * department, and they must keep rendering.
   */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DepartmentEntity = DepartmentAttributes & { _id: Types.ObjectId };

type DepartmentModel = Model<DepartmentAttributes>;

const departmentSchema = new Schema<DepartmentAttributes, DepartmentModel>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: DEPARTMENT_FIELD_LIMITS.NAME },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: DEPARTMENT_FIELD_LIMITS.CODE },
    description: { type: String, trim: true, maxlength: DEPARTMENT_FIELD_LIMITS.DESCRIPTION },
    headDoctor: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export const Department =
  (mongoose.models.Department as DepartmentModel) ?? mongoose.model<DepartmentAttributes, DepartmentModel>('Department', departmentSchema);
