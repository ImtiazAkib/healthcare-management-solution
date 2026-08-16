/**
 * Every role an account can hold.
 *
 * `super-admin` is not a bigger administrator — it is the one account the application
 * itself cannot change, and the only one allowed to create the others. There is exactly
 * one, pinned by a partial unique index on the model and seeded rather than created.
 *
 * `lab` is the diagnostic centre rather than a person's job title: it is the account a
 * technician signs in with to work the order list.
 */
export type UserRole = 'super-admin' | 'admin' | 'doctor' | 'nurse' | 'lab' | 'patient';
