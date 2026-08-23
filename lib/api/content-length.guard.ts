/*
  A coarse ceiling read before the body is touched.

  The exact per-file cap is enforced in the service, but that runs only after `request.formData()`
  has already buffered the whole multipart body into memory — so an oversized request has already
  done its damage before the cap is ever seen. App Router route handlers impose no default body-size
  limit. Reading `Content-Length` up front turns an obviously-too-large request away before a single
  byte is buffered.

  A missing header is allowed through: a browser always sets it on a `FormData` upload, and the
  service check still bounds what actually arrives. The allowance over the file cap covers the
  multipart boundaries and the small text fields that ride alongside the file.
*/
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

/**
 * Whether a request's declared body size is past what a handler will hold.
 *
 * @param request - The incoming request.
 * @param maxBytes - The per-file size cap the handler enforces.
 *
 * @returns True when `Content-Length` is present and exceeds the cap plus overhead.
 */
export function contentLengthExceeds(request: Request, maxBytes: number): boolean {
  const header = request.headers.get('content-length');

  if (!header) {
    return false;
  }

  const length = Number(header);

  return Number.isFinite(length) && length > maxBytes + MULTIPART_OVERHEAD_BYTES;
}
