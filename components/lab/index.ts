/*
  `actions.ts` is deliberately absent from the barrel — a `'use server'` module re-exported through
  a barrel that client components import pulls every action into their graph. The components that
  call an action import it by relative path, as do the dialog-only forms.
*/
export * from './lab-orders-panel';
export * from './lab-work-list';
export * from './lab-orders-table';
export * from './lab-status.badge';
export * from './lab-priority.badge';
export * from './lab-orders-empty';

export type { LabOrderRow } from './lab.types';
