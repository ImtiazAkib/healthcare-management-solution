import { createError, ErrorDto } from '@/lib/result';

import { formatErrorForDisplay } from './error.utils';

import type { ZodError } from 'zod';

const DELIMITER = '__|__';

/**
 * Encode a code and message into a single string for Zod validation messages.
 * Zod carries only a message, so the code rides along inside it and is unpacked again when
 * the issues are mapped to errors.
 *
 * Format: "CODE__|__Message"
 *
 * @param code - The error code number.
 * @param message - The error message text.
 *
 * @returns Encoded string in format "CODE__|__Message".
 */
export function encodeZodMessage(code: number, message: string): string {
  return `${code}${DELIMITER}${message}`;
}

/**
 * Decode an encoded Zod message string into an ErrorDto.
 * If the string is not encoded or the code part is not a valid number, returns code 0 and
 * the original string as error.
 *
 * @param encoded - The encoded message string (e.g., "21020__|__Full name is required").
 *
 * @returns ErrorDto with code and error properties.
 */
export function decodeZodMessage(encoded: string): ErrorDto {
  const parts = encoded.split(DELIMITER);
  if (parts.length > 1) {
    const potentialCode = parts[0];
    const codeNumber = parseInt(potentialCode, 10);
    if (!isNaN(codeNumber)) {
      return {
        code: codeNumber,
        error: parts.slice(1).join(DELIMITER),
      };
    }
  }
  // If not encoded or code is not a number, return original message with code 0
  return {
    code: 0,
    error: encoded,
  };
}

/**
 * Map an encoded Zod message to a display-formatted string.
 * If the message is not encoded, returns it as-is.
 *
 * @param encoded - The encoded message string (e.g., "20000__|__Email is required.")
 *
 * @returns Formatted string like "[20000]: Email is required."
 */
export function mapZodMessageToDisplayFormat(encoded: string): string {
  const { code, error } = decodeZodMessage(encoded);
  // If code is 0, it means the message wasn't encoded - return original
  if (code === 0) {
    return encoded;
  }
  return formatErrorForDisplay(code, error);
}

/**
 * Map Zod validation errors to an array of ErrorDto.
 * Uses decodeZodMessage to extract code and error from encoded Zod messages.
 *
 * @param zodError - The ZodError from safeParse validation.
 *
 * @returns Array of ErrorDto with code, error, and optional field.
 */
export function mapZodErrorsToErrorDto(zodError: ZodError): ErrorDto[] {
  return zodError.issues.map(issue => {
    const { code, error } = decodeZodMessage(issue.message);
    const field = issue.path.length > 0 ? issue.path.join('.') : undefined;
    return createError(code, error, field);
  });
}
