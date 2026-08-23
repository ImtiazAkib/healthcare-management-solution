/**
 * What a stored file is, once it is in.
 */
export type StoredFile = {
  /**
   * Where the driver put it. Opaque to everything above this layer — a GridFS file id today,
   * an S3 object key if the driver is ever swapped. Only the driver that wrote it can read it
   * back, and it never leaves the server.
   */
  storageKey: string;
  size: number;
  mimeType: string;
  fileName: string;
};

/**
 * A file on its way out — streamed, never buffered.
 */
export type StoredFileStream = {
  stream: ReadableStream<Uint8Array>;
  size: number;
  mimeType: string;
  fileName: string;
};

/**
 * The whole storage contract — four operations, no more.
 *
 * Kept this narrow on purpose: swapping in another backend later should touch one file, and that
 * only holds if nothing above depends on how the current one works. Nothing here mentions GridFS,
 * a bucket or a path.
 */
export type StorageDriver = {
  /**
   * Write a file and report where it went. Streams the bytes as they arrive, so a large upload
   * does not sit in memory while the caller waits.
   *
   * @param file - The uploaded file.
   *
   * @returns The stored file's key and metadata.
   */
  save(file: File): Promise<StoredFile>;

  /**
   * Open a stored file for reading. Streams rather than buffers, so a route handler can hand the
   * stream straight to the Response.
   *
   * @param storageKey - Key returned by `save`.
   *
   * @returns The file's stream and metadata, or null when it is not there.
   */
  read(storageKey: string): Promise<StoredFileStream | null>;

  /**
   * Delete a stored file. Deleting one that is already gone is not an error.
   *
   * @param storageKey - Key returned by `save`.
   */
  remove(storageKey: string): Promise<void>;

  /**
   * How many bytes the driver is currently holding, across every stored file — the one
   * measurement the quota guard needs, counted off the bucket so an orphaned file (bytes that
   * landed but whose row failed) is still counted, because it is still real disk.
   *
   * @returns The total stored size in bytes.
   */
  usage(): Promise<number>;
};
