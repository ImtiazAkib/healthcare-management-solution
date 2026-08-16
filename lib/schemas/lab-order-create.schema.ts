import { z } from 'zod';

import { LAB_FIELD_LIMITS, LAB_PRIORITIES, LAB_STATUSES } from '@/constants/lab.const';

import { objectIdField } from './object-id.schema';

export const labFields = {
  testName: z.string().trim().min(1, 'Name the test.').max(LAB_FIELD_LIMITS.TEST_NAME, 'That name is too long.'),
  testCode: z.string().trim().max(LAB_FIELD_LIMITS.TEST_CODE, 'That code is too long.'),
  priority: z.enum(Object.values(LAB_PRIORITIES), 'Choose a valid priority.'),
  status: z.enum(Object.values(LAB_STATUSES), 'Choose a valid status.'),
  summary: z.string().trim().max(LAB_FIELD_LIMITS.SUMMARY, 'That summary is too long.'),
  findings: z.string().trim().max(LAB_FIELD_LIMITS.FINDINGS, 'Those findings are too long.'),
};

export const LabOrderCreateSchema = z.object({
  encounterId: objectIdField,
  tests: z
    .array(z.object({ name: labFields.testName, code: labFields.testCode.optional().or(z.literal('')) }))
    .min(1, 'Order at least one test.')
    .max(LAB_FIELD_LIMITS.TESTS, 'That is more tests than one order should carry.'),
  priority: labFields.priority,
  notes: labFields.summary.optional().or(z.literal('')),
});

export type LabOrderCreateInput = z.input<typeof LabOrderCreateSchema>;
export type LabOrderCreateOutput = z.output<typeof LabOrderCreateSchema>;

/** Moving an order along its lifecycle. Which moves are legal is a service rule. */
export const LabOrderStatusSchema = z.object({
  labOrderId: objectIdField,
  status: labFields.status,
  cancelledReason: labFields.summary.optional().or(z.literal('')),
});

export type LabOrderStatusInput = z.input<typeof LabOrderStatusSchema>;
export type LabOrderStatusOutput = z.output<typeof LabOrderStatusSchema>;
