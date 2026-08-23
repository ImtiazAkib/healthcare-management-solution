/*
  `actions.ts` is deliberately absent, the same as the auth barrel. It is a `'use server'` module, and
  re-exporting it here would pull every action into any client component that imports this barrel. The
  forms that call an action import it by path from `@/components/profile/actions` instead.
*/
export * from './change-password.form';
export * from './profile-edit.form';
export * from './profile-emergency-contact.form';
export * from './profile-identity';
export * from './profile-summary';
export * from './profile.types';
