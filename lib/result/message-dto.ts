/**
 * Message for result.
 */
export type MessageDto = {
  /**
   * Message code.
   */
  code: number;
  /**
   * Explanation of message code.
   */
  message: string;
};

/**
 * Create a message DTO.
 *
 * @param code - Message code.
 * @param message - Explanation of message code.
 *
 * @returns Instance of MessageDto.
 */
export function createMessage(code: number, message: string): MessageDto {
  return { code, message };
}
