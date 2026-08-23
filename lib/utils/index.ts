/*
  `@/lib/utils` resolves here, so `import { cn } from '@/lib/utils'` keeps working and the
  shadcn alias in `components.json` stays correct.

  Everything re-exported here must be safe in a client bundle. That is why the utils that
  touch server-only or heavy modules — mongoose above all — import them with `import type`,
  which the compiler erases.
*/
export * from './appointment.utils';
export * from './auth.utils';
export * from './availability.utils';
export * from './caller.utils';
export * from './class-name.utils';
export * from './datetime.utils';
export * from './encounter.utils';
export * from './error.utils';
export * from './file-signature.utils';
export * from './invoice.utils';
export * from './llms.utils';
export * from './money.utils';
export * from './mongo.utils';
export * from './navigation.utils';
export * from './patient.utils';
export * from './phone.utils';
export * from './prescription.utils';
export * from './role.utils';
export * from './url.utils';
export * from './user.utils';
export * from './vitals.utils';
export * from './zod.utils';
