import type { ErrorDto } from './error-dto';
import type { ListResultInfo } from './list-result-info';
import type { MessageDto } from './message-dto';

/**
 * List result.
 *
 * @template T - Data transfer object.
 */
export type ListResult<T> = {
  /**
   * Whether the result was successful.
   */
  success: boolean;
  /**
   * Provides information about result like skip, take, count, total count.
   * If result is empty, information will be null.
   */
  resultInfo: ListResultInfo | null;
  /**
   * List of items.
   */
  result: T[];
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
 * @param result - Items.
 *
 * @returns Instance of ListResult.
 */
export function listSuccess<T>(result: T[]): ListResult<T> {
  return {
    success: true,
    resultInfo: null,
    result,
    errors: [],
    messages: [],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Items.
 * @param message - Explanation message as warning or note.
 *
 * @returns Instance of ListResult.
 */
export function listSuccessWithMessage<T>(result: T[], message: MessageDto): ListResult<T> {
  return {
    success: true,
    resultInfo: null,
    result,
    errors: [],
    messages: [message],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Items.
 * @param messages - Explanation messages as warnings or notes.
 *
 * @returns Instance of ListResult.
 */
export function listSuccessWithMessages<T>(result: T[], messages: MessageDto[]): ListResult<T> {
  if (messages.length === 0) {
    throw new Error('Messages must contain at least one element');
  }
  return {
    success: true,
    resultInfo: null,
    result,
    errors: [],
    messages,
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Items.
 * @param count - Count of items for skip/take values.
 * @param skip - Skip number of items.
 * @param take - Take number of items.
 * @param totalCount - Total count of items in storage.
 *
 * @returns Instance of ListResult.
 */
export function listSuccessWithInfo<T>(result: T[], count: number, skip: number, take: number, totalCount: number): ListResult<T> {
  return {
    success: true,
    resultInfo: {
      count,
      skip,
      take,
      totalCount,
    },
    result,
    errors: [],
    messages: [],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Items.
 * @param count - Count of items for skip/take values.
 * @param skip - Skip number of items.
 * @param take - Take number of items.
 * @param totalCount - Total count of items in storage.
 * @param message - Explanation message as warning or note.
 *
 * @returns Instance of ListResult.
 */
export function listSuccessWithInfoAndMessage<T>(
  result: T[],
  count: number,
  skip: number,
  take: number,
  totalCount: number,
  message: MessageDto
): ListResult<T> {
  return {
    success: true,
    resultInfo: {
      count,
      skip,
      take,
      totalCount,
    },
    result,
    errors: [],
    messages: [message],
  };
}

/**
 * Extension method to indicate successful result.
 *
 * @template T
 * @param result - Items.
 * @param count - Count of items for skip/take values.
 * @param skip - Skip number of items.
 * @param take - Take number of items.
 * @param totalCount - Total count of items in storage.
 * @param messages - Explanation messages as warnings or notes.
 *
 * @returns Instance of ListResult.
 */
export function listSuccessWithInfoAndMessages<T>(
  result: T[],
  count: number,
  skip: number,
  take: number,
  totalCount: number,
  messages: MessageDto[]
): ListResult<T> {
  if (messages.length === 0) {
    throw new Error('Messages must contain at least one element');
  }
  return {
    success: true,
    resultInfo: {
      count,
      skip,
      take,
      totalCount,
    },
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
 * @returns Instance of ListResult.
 */
export function listFailure<T>(error: ErrorDto): ListResult<T> {
  return {
    success: false,
    resultInfo: null,
    result: [],
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
 * @returns Instance of ListResult.
 */
export function listFailureWithErrors<T>(errors: ErrorDto[]): ListResult<T> {
  if (errors.length === 0) {
    throw new Error('Errors must contain at least one element');
  }
  return {
    success: false,
    resultInfo: null,
    result: [],
    errors,
    messages: [],
  };
}
