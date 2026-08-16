/**
 * Format an error for display in the UI as "[CODE]: Error".
 *
 * @param code - The error code.
 * @param error - The error message.
 *
 * @returns Formatted string like "[CODE]: Error".
 */
export function formatErrorForDisplay(code: number, error: string): string {
  return `[${code}]: ${error}`;
}

/**
 * Read a message off an unknown thrown value.
 * `catch` gives back `unknown`, and services need a string for the failure result without
 * asserting the value into an Error it may not be.
 *
 * @param error - The caught value.
 * @param fallback - Message to use when nothing usable can be read.
 *
 * @returns The error message, or the fallback.
 */
export function messageFromUnknownError(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}
