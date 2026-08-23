import mongoose from 'mongoose';

import { STORAGE } from '@/constants/storage.const';

import { connectToDatabase } from '@/lib/mongodb';

import type { StorageDriver, StoredFile, StoredFileStream } from './storage.types';

/*
  Report files live in MongoDB rather than on disk.

  A filesystem path works on a single long-lived box and silently fails on a serverless deploy,
  where the filesystem is read-only apart from a `/tmp` that is wiped between invocations — the
  upload succeeds and the download 404s minutes later. GridFS needs no second service and behaves
  the same everywhere. The trade is database storage, kept honest by the per-file cap and the quota
  guard; anything larger belongs in object storage, which is a new driver rather than a change here.

  Diagnostic reports are stored **raw** — a PDF or an image is served back byte-for-byte. There is
  deliberately no re-encoding pass: a lab report is a record, and quietly recompressing a diagnostic
  image would change what a clinician reads.
*/

/**
 * The bucket, opened against the connection `connectToDatabase()` caches.
 *
 * Not memoized: `GridFSBucket` is a thin handle over the existing connection, and holding one
 * across a hot reload would outlive the connection it wraps.
 *
 * @returns The report-files bucket.
 */
async function openBucket(): Promise<mongoose.mongo.GridFSBucket> {
  await connectToDatabase();

  if (!mongoose.connection.db) {
    throw new Error('No database connection for the report-files bucket');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: STORAGE.BUCKET });
}

export const gridFsStorage: StorageDriver = {
  async save(file: File): Promise<StoredFile> {
    const bucket = await openBucket();

    const upload = bucket.openUploadStream(file.name, { metadata: { mimeType: file.type } });

    /*
      The error listener is attached before the first byte, not just around `finish`. A write stream
      is an `EventEmitter`, and an `error` it emits mid-upload — a connection drop while chunks are
      still arriving — with no listener attached would throw and take the process down. Racing every
      await against it turns that into a rejection this method catches.
    */
    const failed = new Promise<never>((_, reject) => {
      upload.once('error', reject);
    });

    /*
      The web `File` gives a `ReadableStream`; GridFS wants a Node writable. Piping by hand rather
      than reaching for `Readable.fromWeb` keeps this working on both the Node and edge builds without
      a conversion helper, and honours backpressure so a large file does not grow the buffer.
    */
    const reader = file.stream().getReader();

    try {
      for (;;) {
        const { done, value } = await Promise.race([failed, reader.read()]);

        if (done) {
          break;
        }

        // Backpressure: wait for the buffer to drain — or for a write error — rather than growing it.
        if (!upload.write(value)) {
          await Promise.race([failed, new Promise(resolve => upload.once('drain', resolve))]);
        }
      }

      await Promise.race([
        failed,
        new Promise<void>(resolve => {
          upload.once('finish', () => resolve());
          upload.end();
        }),
      ]);
    } catch (error) {
      // A failure mid-upload leaves a partial file — drop it so it does not linger as an orphan.
      await bucket.delete(upload.id).catch(() => undefined);

      throw error;
    } finally {
      reader.releaseLock();
    }

    return { storageKey: String(upload.id), size: file.size, mimeType: file.type, fileName: file.name };
  },

  async read(storageKey: string): Promise<StoredFileStream | null> {
    if (!mongoose.Types.ObjectId.isValid(storageKey)) {
      return null;
    }

    const bucket = await openBucket();
    const id = new mongoose.Types.ObjectId(storageKey);

    const [record] = await bucket.find({ _id: id }).limit(1).toArray();

    if (!record) {
      return null;
    }

    const download = bucket.openDownloadStream(id);

    return {
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          download.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));

            // Backpressure: once the consumer's queue is full, stop pulling from Mongo until it drains,
            // so a slow client cannot make the whole file accumulate in memory.
            if (controller.desiredSize !== null && controller.desiredSize <= 0) {
              download.pause();
            }
          });
          download.on('end', () => controller.close());
          download.on('error', error => controller.error(error));
        },
        pull() {
          download.resume();
        },
        cancel() {
          download.destroy();
        },
      }),
      size: record.length,
      mimeType: String(record.metadata?.mimeType ?? 'application/octet-stream'),
      fileName: record.filename,
    };
  },

  async remove(storageKey: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(storageKey)) {
      return;
    }

    const bucket = await openBucket();

    // Deleting a file that is already gone is not an error worth surfacing.
    await bucket.delete(new mongoose.Types.ObjectId(storageKey)).catch(() => undefined);
  },

  async usage(): Promise<number> {
    await connectToDatabase();

    if (!mongoose.connection.db) {
      return 0;
    }

    /*
      Summed straight off the bucket's `.files` collection rather than counted from the report rows,
      because those can drift: a save that landed its bytes but failed its row leaves an orphan the
      rows never mention, and it is real disk that still fills the cap.
    */
    const files = mongoose.connection.db.collection(`${STORAGE.BUCKET}.files`);
    const [row] = await files.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: '$length' } } }]).toArray();

    return row?.total ?? 0;
  },
};
