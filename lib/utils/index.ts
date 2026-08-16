/*
  `@/lib/utils` resolves here, so `import { cn } from '@/lib/utils'` keeps working and
  the shadcn alias in `components.json` stays correct.

  Everything re-exported here must be safe in a client bundle. That is why the utils that
  touch server-only or heavy modules — mongoose above all — import them with `import type`,
  which the compiler erases.
*/
export * from './class-name.utils';
