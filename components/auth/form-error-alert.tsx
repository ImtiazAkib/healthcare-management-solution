type FormErrorAlertProps = { message: string };

/** Consistent form-level failure treatment for authentication flows. */
export function FormErrorAlert({ message }: FormErrorAlertProps) {
  return (
    <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
      {message}
    </p>
  );
}
