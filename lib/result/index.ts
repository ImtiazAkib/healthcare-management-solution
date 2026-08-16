import type { EmptyResult } from './empty-result';
import type { ListResult } from './list-result';
import type { SingleResult } from './single-result';

export type { ErrorDto } from './error-dto';
export type { MessageDto } from './message-dto';
export type { ListResultInfo } from './list-result-info';

export type { EmptyResult } from './empty-result';
export type { SingleResult } from './single-result';
export type { ListResult } from './list-result';

export { createError } from './error-dto';
export { createMessage } from './message-dto';

export {
  emptySuccess,
  emptySuccessWithMessage,
  emptySuccessWithMessages,
  emptyFailure,
  emptyFailureWithError,
  emptyFailureWithErrors,
} from './empty-result';

export { singleSuccess, singleSuccessWithMessage, singleSuccessWithMessages, singleFailure, singleFailureWithErrors } from './single-result';

export {
  listSuccess,
  listSuccessWithMessage,
  listSuccessWithMessages,
  listSuccessWithInfo,
  listSuccessWithInfoAndMessage,
  listSuccessWithInfoAndMessages,
  listFailure,
  listFailureWithErrors,
} from './list-result';

/**
 * Check if result is successful.
 *
 * @template T
 * @param result - Result to check.
 *
 * @returns True if result is successful.
 */
export function isSuccess<T>(result: EmptyResult | SingleResult<T> | ListResult<T>): boolean {
  return result.success;
}

/**
 * Check if result is a failure.
 *
 * @template T
 * @param result - Result to check.
 *
 * @returns True if result is a failure.
 */
export function isFailure<T>(result: EmptyResult | SingleResult<T> | ListResult<T>): boolean {
  return !result.success;
}
