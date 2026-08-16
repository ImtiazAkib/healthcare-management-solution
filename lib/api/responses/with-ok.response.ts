import { NextResponse } from 'next/server';

/**
 * Shortcut method for returning ok response.
 *
 * @returns Next response with 200 status code.
 */
export function withOk(): NextResponse;

/**
 * Shortcut method for returning ok response with data.
 *
 * @param data Data to return.
 *
 * @returns Next response with 200 status code.
 */
export function withOk<T>(data: T): NextResponse;

/**
 * Shortcut method for returning ok response with optional data.
 *
 * @param data Data to return (optional).
 *
 * @returns Next response with 200 status code.
 */
export function withOk<T>(data?: T) {
  if (!data) {
    return new NextResponse(undefined, { status: 200 });
  }
  return NextResponse.json(data, { status: 200 });
}
