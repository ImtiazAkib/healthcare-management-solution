import type { ErrorDto } from './error-dto';
import type { MessageDto } from './message-dto';

/**
 * Single result.
 *
 * @template T - Data transfer object.
 */
export type SingleResult<T> = {
  /**
   * Whether the result was successful.
   */
  success: boolean;
  /**
   * One item.
   */
  result: T | null;
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
 * @template T
 * @param result - Item.
 *
 * @returns Instance of SingleResult.
 */
export function singleSuccess<T>(result: T): SingleResult<T> {
  return {
    success: true,
    result,
    errors: [],
    messages: [],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Item.
 * @param message - Explanation message as warning or note.
 *
 * @returns Instance of SingleResult.
 */
export function singleSuccessWithMessage<T>(result: T, message: MessageDto): SingleResult<T> {
  return {
    success: true,
    result,
    errors: [],
    messages: [message],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Item.
 * @param messages - Explanation messages as warnings or notes.
 *
 * @returns Instance of SingleResult.
 */
export function singleSuccessWithMessages<T>(result: T, messages: MessageDto[]): SingleResult<T> {
  if (messages.length === 0) {
    throw new Error('Messages must contain at least one element');
  }
  return {
    success: true,
    result,
    errors: [],
    messages,
  };
}

/**
 * Extension method to indicate failed result.
 *
 * @template T
 * @param error - Error that caused the failure.
 *
 * @returns Instance of SingleResult.
 */
export function singleFailure<T>(error: ErrorDto): SingleResult<T> {
  return {
    success: false,
    result: null,
    errors: [error],
    messages: [],
  };
}

/**
 * Extension method to indicate failed result.
 *
 * @template T
 * @param errors - Errors that caused the failure.
 *
 * @returns Instance of SingleResult.
 */
export function singleFailureWithErrors<T>(errors: ErrorDto[]): SingleResult<T> {
  if (errors.length === 0) {
    throw new Error('Errors must contain at least one element');
  }
  return {
    success: false,
    result: null,
    errors,
    messages: [],
  };
}
