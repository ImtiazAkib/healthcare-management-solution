/**
 * Error for result.
 */
export type ErrorDto = {
  /**
   * Error code.
   */
  code: number;
  /**
   * Explanation of error code.
   */
  error: string;
  /**
   * Optional field name for field-specific validation errors.
   */
  field?: string;
};

/**
 * Create an error DTO.
 *
 * @param code - Error code.
 * @param error - Explanation of error code.
 * @param field - Optional field name for field-specific errors.
 *
 * @returns Instance of ErrorDto.
 */
export function createError(code: number, error: string, field?: string): ErrorDto {
  return { code, error, ...(field && { field }) };
}
