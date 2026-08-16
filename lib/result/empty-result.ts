import type { ErrorDto } from './error-dto';
import type { MessageDto } from './message-dto';

/**
 * Empty result.
 */
export type EmptyResult = {
  /**
   * Whether the result was successful.
   */
  success: boolean;
  /**
   * Errors for failed result. By default they are empty.
   */
  errors: ErrorDto[];
  /**
   * Messages for successful result as warnings or notes. By default they are empty.
   */
  messages: MessageDto[];
};

/**
 * Extension method to indicate successful result.
 *
 * @returns Instance of EmptyResult.
 */
export function emptySuccess(): EmptyResult {
  return {
    success: true,
    errors: [],
    messages: [],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @param message - Explanation message as warning or note.
 *
 * @returns Instance of EmptyResult.
 */
export function emptySuccessWithMessage(message: MessageDto): EmptyResult {
  return {
    success: true,
    errors: [],
    messages: [message],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @param messages - Explanation messages as warnings or notes.
 *
 * @returns Instance of EmptyResult.
 */
export function emptySuccessWithMessages(messages: MessageDto[]): EmptyResult {
  if (messages.length === 0) {
    throw new Error('Messages must contain at least one element');
  }
  return {
    success: true,
    errors: [],
    messages,
  };
}

/**
 * Extension method to indicate failed result.
 *
 * @returns Instance of EmptyResult.
 */
export function emptyFailure(): EmptyResult {
  return {
    success: false,
    errors: [],
    messages: [],
  };
}

/**
 * Extension method to indicate failed result.
 *
 * @param error - Error that caused the failure.
 *
 * @returns Instance of EmptyResult.
 */
export function emptyFailureWithError(error: ErrorDto): EmptyResult {
  return {
    success: false,
    errors: [error],
    messages: [],
  };
}

/**
 * Extension method to indicate failed result.
 *
 * @param errors - Errors that caused the failure.
 *
 * @returns Instance of EmptyResult.
 */
export function emptyFailureWithErrors(errors: ErrorDto[]): EmptyResult {
  if (errors.length === 0) {
    throw new Error('Errors must contain at least one element');
  }
  return {
    success: false,
    errors,
    messages: [],
  };
}
