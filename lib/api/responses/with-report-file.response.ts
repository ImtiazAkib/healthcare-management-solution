import { NextResponse } from 'next/server';

import type { StoredFileStream } from '@/lib/storage';

/**
 * Strip the characters that would let a filename break out of the `Content-Disposition` header —
 * a CR/LF could inject a header, a quote or backslash could end the quoted string early.
 *
 * @param fileName - The stored filename.
 *
 * @returns A header-safe filename.
 */
function toHeaderFileName(fileName: string): string {
  return fileName.replace(/[\r\n"\\]/g, '_');
}

/**
 * Stream a stored report file back as a response, with the headers that make serving an
 * attacker-controlled file from the app's own origin safe.
 *
 * An uploaded report is content somebody else supplied. `X-Content-Type-Options: nosniff` stops the
 * browser second-guessing the declared type, `Content-Security-Policy: sandbox` neuters any script
 * or plugin the file might carry, and `Cache-Control: private, no-store` keeps a medical file out of
 * shared caches. `attachment` downloads it; `inline` previews it in the sandbox. Together they are
 * the difference between serving a file and running one.
 *
 * @param file - The opened file stream and its metadata.
 * @param disposition - Whether to download (`attachment`) or preview (`inline`).
 *
 * @returns The streaming response.
 */
export function withReportFile(file: StoredFileStream, disposition: 'attachment' | 'inline'): NextResponse {
  return new NextResponse(file.stream, {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.size),
      'Content-Disposition': `${disposition}; filename="${toHeaderFileName(file.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
      'Cache-Control': 'private, no-store',
    },
  });
}
