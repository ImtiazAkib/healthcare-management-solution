/*
  A file's declared type is whatever the client said it was. This reads the first bytes and checks
  they match, which is the only part of type validation that cannot be spoofed by editing a request
  — the extension and the `Content-Type` header are both attacker-supplied.

  Deliberately small: the four signatures the accepted report types need, and a permissive answer
  for a type with no dependable magic number. It is a filter against a mislabelled file, not a virus
  scanner.
*/

const SIGNATURES: { mimeTypes: string[]; magic: number[][] }[] = [
  { mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] }, // %PDF
  { mimeTypes: ['image/png'], magic: [[0x89, 0x50, 0x4e, 0x47]] }, // .PNG
  { mimeTypes: ['image/jpeg'], magic: [[0xff, 0xd8, 0xff]] }, // FF D8 FF
  /*
    A WebP is a RIFF container, and the four bytes that say `WEBP` sit at offset 8, past what this
    reads. `RIFF` alone therefore also matches a .wav or .avi — the same looseness a mislabel check
    can allow, since the declared type and the extension both had to agree first. This is not a
    decoder.
  */
  { mimeTypes: ['image/webp'], magic: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF
];

/** Longest signature above, so only that many bytes are ever read. */
const HEADER_BYTES = 4;

/**
 * Whether a file's opening bytes match the type it claims to be.
 *
 * A type with no signature worth checking passes — refusing it would reject legitimate files, and
 * it is already bounded by the size cap and the accepted-type list.
 *
 * @param file - The uploaded file.
 *
 * @returns True when the bytes agree with the declared type, or the type has no signature to check.
 */
export async function fileMatchesDeclaredType(file: File): Promise<boolean> {
  const expected = SIGNATURES.find(signature => signature.mimeTypes.includes(file.type));

  if (!expected) {
    return true;
  }

  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());

  return expected.magic.some(signature => signature.every((byte, index) => header[index] === byte));
}
