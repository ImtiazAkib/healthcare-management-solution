/*
  `actions.ts` is deliberately absent from the barrel — a `'use server'` module re-exported
  through a barrel that client components import pulls every action into their graph. The
  components that call an action import it by relative path.
*/
export * from './prescriptions-panel';
export * from './prescriptions-table';
export * from './prescriptions-empty';
export * from './prescription-screen';
export * from './prescription-print-sheet';
export * from './prescription-status.badge';

export type { PrescriptionRow, PrescriptionDetail } from './prescriptions.types';
